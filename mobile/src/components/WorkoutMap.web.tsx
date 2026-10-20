import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { View } from "react-native";
import { Txt } from "./ui";
import { demoRoute } from "../features/tracking/simulator";
import {
  hasMapbox,
  mapTiles,
  MapPoint,
  MapRoute,
} from "../features/maps/config";
const noRoutes: MapRoute[] = [];
export default function WorkoutMap({
  height = 300,
  points = demoRoute,
  routes = noRoutes,
}: {
  height?: number;
  points?: MapPoint[];
  routes?: MapRoute[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    import("leaflet")
      .then((L) => {
        if (cancelled || !el.current) return;
        setFailed(false);
        map = L.map(el.current, { scrollWheelZoom: false }).setView(
          [59.931, 10.759],
          13,
        );
        L.tileLayer(mapTiles, {
          maxZoom: 19,
          attribution: hasMapbox
            ? '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
          .on("tileerror", () => {
            if (!cancelled) setFailed(true);
          })
          .addTo(map);
        const layers = routes.length
          ? routes
          : [
              {
                id: "activity",
                name: "Eksempelrute",
                owner: "",
                points,
                color: "#356618",
              },
            ];
        const bounds = L.latLngBounds([]);
        layers.forEach((route) => {
          if (route.points.length < 2) return;
          const coords = route.points.map(
            (p) => [p.latitude, p.longitude] as [number, number],
          );
          const line = L.polyline(coords, {
            color: route.color,
            weight: 5,
          }).addTo(map!);
          const label = document.createElement("span");
          label.textContent = `${route.name}${route.owner ? " · " + route.owner : ""}`;
          line.bindTooltip(label, { sticky: true });
          const marker = L.circleMarker(coords[0], {
            radius: 8,
            color: route.color,
            fillOpacity: 1,
          }).addTo(map!);
          const ownerLabel = document.createElement("span");
          ownerLabel.textContent = route.owner || "Start";
          marker.bindTooltip(ownerLabel, {
            permanent: !!route.owner,
            direction: "top",
          });
          coords.forEach((p) => bounds.extend(p));
        });
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [35, 35] });
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(el.current);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [points, routes]);
  return (
    <View>
      <div
        ref={el}
        role="region"
        aria-label="Interaktivt kart"
        style={{ height, width: "100%", zIndex: 0 }}
      />
      {failed && (
        <Txt size={12} muted>
          Kartflisene kunne ikke lastes. Kontroller nettverk eller karttilgang.
        </Txt>
      )}
    </View>
  );
}
