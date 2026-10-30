import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pressable, View } from "react-native";
import type {
  Map as WebMap,
  Marker as WebMarker,
  GeoJSONSource,
} from "mapbox-gl-v3";
import "mapbox-gl-v3/dist/mapbox-gl.css";
import { loadMapEngine } from "../maps/prewarm.web";
import { hasMapbox, mapboxToken, createMapStyle } from "../maps/config";
import { zoneShapes } from "./zoneGeometry";
import { ZonePin } from "./ZonePin";
import { Txt } from "../../components/ui";
import type { ClubZoneMapProps } from "./ClubZoneMap";

export default function ClubZoneMap({
  turfs,
  selected,
  onSelect,
  satellite,
  recenter,
  target,
}: ClubZoneMapProps) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<WebMap | null>(null);
  const [ready, setReady] = useState(0),
    [error, setError] = useState(false);
  const [pins, setPins] = useState<{ id: string; node: HTMLElement }[]>([]);
  const shapes = useMemo(() => zoneShapes(turfs), [turfs]);
  const state = useRef({ shapes, onSelect });
  useEffect(() => {
    state.current = { shapes, onSelect };
  }, [shapes, onSelect]);
  useEffect(() => {
    let alive = true;
    if (!hasMapbox || !el.current) return;
    void loadMapEngine()
      .then(({ default: engine }) => {
        if (!alive || !el.current) return;
        const view = new engine.Map({
          container: el.current,
          accessToken: mapboxToken,
          style: createMapStyle("standard", false, false, false),
          center: [10.7522, 59.9139],
          zoom: 12,
        });
        map.current = view;
        view.on("style.load", () => setReady((n) => n + 1));
        view.on("error", () => {
          if (alive) setError(true);
        });
        view.on("click", "club-areas", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") state.current.onSelect(id);
        });
        view.on("idle", () => {
          if (alive) setError(false);
        });
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (map.current)
      map.current.setStyle(
        createMapStyle(
          satellite ? "satellite" : "standard",
          satellite,
          false,
          false,
        ),
      );
  }, [satellite]);
  useEffect(() => {
    const view = map.current;
    // style.load means sources/layers can be added. isStyleLoaded also waits
    // for map resources, which could skip this effect permanently on slow tiles.
    if (!view || !ready) return;
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: shapes.map((s) => ({
        type: "Feature",
        properties: { id: s.turf.id, color: s.color },
        geometry: {
          type: "Polygon",
          coordinates: [
            [...s.area, s.area[0]].map((p) => [p.longitude, p.latitude]),
          ],
        },
      })),
    };
    if (view.getSource("club-zones"))
      (view.getSource("club-zones") as GeoJSONSource).setData(data);
    else {
      view.addSource("club-zones", { type: "geojson", data });
      view.addLayer({
        id: "club-areas",
        type: "fill",
        source: "club-zones",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.26 },
      });
      view.addLayer({
        id: "club-outlines",
        type: "line",
        source: "club-zones",
        paint: { "line-color": ["get", "color"], "line-width": 2 },
      });
    }
  }, [ready, shapes]);
  useEffect(() => {
    const view = map.current;
    if (!view || !ready) return;
    let alive = true;
    const markers: WebMarker[] = [];
    void loadMapEngine().then(({ default: engine }) => {
      if (!alive) return;
      const nodes = shapes.map((s) => {
        const node = document.createElement("div");
        markers.push(
          new engine.Marker({ element: node, anchor: "bottom" })
            .setLngLat([s.anchor.longitude, s.anchor.latitude])
            .addTo(view),
        );
        // Mapbox marks its wrapper as an image, hiding the interactive child
        // from screen readers. The portal supplies the labelled button.
        node.setAttribute("role", "presentation");
        node.removeAttribute("aria-label");
        return { id: s.turf.id, node };
      });
      setPins(nodes);
    });
    return () => {
      alive = false;
      markers.forEach((m) => m.remove());
    };
  }, [ready, shapes]);
  useEffect(() => {
    const view = map.current,
      points = shapes.flatMap((s) => s.turf.route);
    if (!view || !ready) return;
    if (target) {
      view.flyTo({
        center: [target.longitude, target.latitude],
        zoom: 14,
        duration: 300,
      });
      return;
    }
    if (!points.length) return;
    view.fitBounds(
      [
        [
          Math.min(...points.map((p) => p.longitude)),
          Math.min(...points.map((p) => p.latitude)),
        ],
        [
          Math.max(...points.map((p) => p.longitude)),
          Math.max(...points.map((p) => p.latitude)),
        ],
      ],
      {
        padding: { top: 90, bottom: 190, left: 65, right: 65 },
        maxZoom: 16,
        duration: 300,
      },
    );
  }, [ready, shapes, recenter, target]);
  return (
    <View style={{ flex: 1 }}>
      <style>{`.vyro-club-map .mapboxgl-ctrl-bottom-left, .vyro-club-map .mapboxgl-ctrl-bottom-right { bottom: 190px; }`}</style>
      <div
        ref={el}
        className="vyro-club-map"
        style={{ position: "absolute", inset: 0 }}
      />
      {pins.map((pin) => {
        const shape = shapes.find((s) => s.turf.id === pin.id);
        return shape
          ? createPortal(
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Se sonen ${shape.turf.name}`}
                onPress={() => onSelect(shape.turf.id)}
              >
                <ZonePin
                  name={shape.turf.profiles?.display_name ?? "Medlem"}
                  path={shape.turf.profiles?.avatar_path}
                  color={shape.color}
                  selected={selected === pin.id}
                />
              </Pressable>,
              pin.node,
              pin.id,
            )
          : null;
      })}
      {(!hasMapbox || error) && (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 80,
            padding: 16,
            backgroundColor: "white",
            borderRadius: 16,
          }}
        >
          <Txt>
            Kartet er ikke tilgjengelig nå. Du kan fortsatt se rangeringen under
            Resultater.
          </Txt>
        </View>
      )}
    </View>
  );
}
