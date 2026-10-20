import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { routeSegments } from "../features/tracking/gps";
import { hasMapbox, mapTiles } from "../features/maps/config";
import type { LiveMapProps } from "./LiveMap";
import { Txt } from "./ui";
const empty: NonNullable<LiveMapProps["route"]> = [];
const emptyOverlays: NonNullable<LiveMapProps["overlays"]> = [];
// Henos's map lifecycle and moving camera, with bundled Leaflet and light CARTO tiles.
export default function LiveMap({
  height = 300,
  route = empty,
  position = null,
  follow = false,
  overlays = emptyOverlays,
}: LiveMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<typeof Leaflet | null>(null);
  const [failed, setFailed] = useState(false);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  useEffect(() => {
    let live = true;
    import("leaflet").then(
      (l) => {
        if (live) setL(l);
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!L || !el.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(
      [59.9139, 10.7522],
      13,
    );
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    L.tileLayer(mapTiles, {
      maxZoom: 19,
      attribution: hasMapbox
        ? '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    })
      .on("tileerror", () => setFailed(true))
      .addTo(m);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      layer.current = null;
    };
  }, [L]);
  useEffect(() => {
    if (!L || !map.current || !layer.current) return;
    const leaflet = L;
    const group = layer.current;
    group.clearLayers();
    const bounds = L.latLngBounds([]);
    function draw(
      segments: NonNullable<LiveMapProps["route"]>,
      color: string,
      label: string,
    ) {
      for (const segment of segments) {
        const coords = segment.map(
          (p) => [p.latitude, p.longitude] as [number, number],
        );
        coords.forEach((p) => bounds.extend(p));
        if (coords.length > 1)
          leaflet.polyline(coords, { color, weight: 5 }).addTo(group);
      }
      const start = segments.flat()[0];
      if (start) {
        const marker = leaflet
          .circleMarker([start.latitude, start.longitude], {
            radius: 6,
            color,
            fillOpacity: 1,
          })
          .addTo(group);
        const text = document.createElement("span");
        text.textContent = label;
        marker.bindTooltip(text, {
          permanent: label !== "Start",
          direction: "top",
        });
      }
    }
    draw(route, "#356618", "Start");
    overlays.forEach((r) =>
      draw(routeSegments(r.points), r.color, r.owner || r.name),
    );
    if (position && follow) {
      L.circleMarker([position.latitude, position.longitude], {
        radius: 8,
        color: "#FFFFFF",
        weight: 3,
        fillColor: "#4777CC",
        fillOpacity: 1,
      }).addTo(group);
      map.current.setView([position.latitude, position.longitude], 16);
    } else if (bounds.isValid())
      map.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 17 });
  }, [L, route, position, follow, overlays]);
  return (
    <View>
      <div
        ref={el}
        role="region"
        aria-label={
          follow ? "Kart som følger posisjonen din" : "Interaktivt kart"
        }
        style={{
          width: "100%",
          height,
          background: "#F4F5F2",
          position: "relative",
          zIndex: 0,
        }}
      />
      {failed && (
        <Txt muted size={12}>
          Kartet kunne ikke lastes. Sjekk nettforbindelsen eller karttilgangen.
        </Txt>
      )}
    </View>
  );
}
