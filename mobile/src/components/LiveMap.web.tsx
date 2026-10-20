import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type { Coord } from "../features/tracking/gps";
import { brand } from "../theme/tokens";
import type { LiveMapProps } from "./LiveMap";
import { Txt } from "./ui";

// react-native-maps has no web support, so web uses Leaflet from a CDN with
// OpenStreetMap data. Nothing native is imported here.
type Leaflet = any;
const CDN = "https://unpkg.com/leaflet@1.9.4/dist/";
let loading: Promise<Leaflet> | null = null;
function loadLeaflet(): Promise<Leaflet> {
  const w = window as unknown as { L?: Leaflet };
  if (w.L) return Promise.resolve(w.L);
  loading ??= new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${CDN}leaflet.css`;
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = `${CDN}leaflet.js`;
    script.onload = () => resolve(w.L);
    script.onerror = () => {
      loading = null;
      reject(new Error("Leaflet"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
const oslo = { latitude: 59.9139, longitude: 10.7522 };
const ll = (c: Coord) => [c.latitude, c.longitude];

export default function LiveMap({
  height = 300,
  route = [],
  position = null,
  follow = false,
}: LiveMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<Leaflet>(null);
  const [failed, setFailed] = useState(false);
  const map = useRef<Leaflet>(null);
  const layer = useRef<Leaflet>(null);
  useEffect(() => {
    loadLeaflet().then(setL, () => setFailed(true));
  }, []);
  useEffect(() => {
    if (!L || !el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false }).setView(
      ll(position ?? route.flat()[0] ?? oslo),
      16,
    );
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        attribution: "© OpenStreetMap · © CARTO",
      },
    ).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // Created once; route and position updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);
  useEffect(() => {
    if (!L || !map.current) return;
    layer.current.clearLayers();
    for (const segment of route)
      if (segment.length > 1)
        L.polyline(segment.map(ll), { color: brand.lime, weight: 5 }).addTo(
          layer.current,
        );
    const start = route.flat()[0];
    if (start)
      L.circleMarker(ll(start), {
        radius: 6,
        color: brand.lime,
        fillColor: brand.navy,
        fillOpacity: 1,
      }).addTo(layer.current);
    if (position && follow) {
      L.circleMarker(ll(position), {
        radius: 8,
        color: "#FFFFFF",
        weight: 3,
        fillColor: brand.lavender,
        fillOpacity: 1,
      }).addTo(layer.current);
      map.current.panTo(ll(position));
    } else if (!follow && route.flat().length > 1) {
      map.current.fitBounds(L.latLngBounds(route.flat().map(ll)), {
        padding: [30, 30],
      });
    }
  }, [L, route, position, follow]);
  if (failed)
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <Txt muted size={13}>
          Kartet kunne ikke lastes. Sjekk nettforbindelsen.
        </Txt>
      </View>
    );
  return (
    <div
      ref={el}
      role="img"
      aria-label={
        follow ? "Kart som følger posisjonen din" : "Kart over ruten din"
      }
      style={{
        width: "100%",
        height,
        background: brand.navy,
        // Own stacking context so Leaflet panes stay under tabs and footers.
        position: "relative",
        zIndex: 0,
      }}
    />
  );
}
