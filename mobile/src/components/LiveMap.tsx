import { useEffect, useRef } from "react";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { View } from "react-native";
import type { Coord } from "../features/tracking/gps";
import { routeSegments } from "../features/tracking/gps";
import { hasMapbox, mapTiles, MapRoute } from "../features/maps/config";
import { useAppStore } from "../stores/useAppStore";
import { Txt } from "./ui";
export type LiveMapProps = {
  height?: number;
  route?: Coord[][];
  position?: Coord | null;
  follow?: boolean;
  overlays?: MapRoute[];
};
const oslo = { latitude: 59.9139, longitude: 10.7522 };
// Henos's native map: keep the moving camera and separate pause segments.
export default function LiveMap({
  height = 300,
  route = [],
  position = null,
  follow = false,
  overlays = [],
}: LiveMapProps) {
  const map = useRef<MapView>(null);
  const theme = useAppStore((s) => s.theme);
  const points = [...route.flat(), ...overlays.flatMap((r) => r.points)];
  const start = route.flat()[0];
  const center = position ?? points[points.length - 1] ?? oslo;
  useEffect(() => {
    if (follow && position)
      map.current?.animateCamera({ center: position }, { duration: 600 });
  }, [follow, position]);
  const fit = () => {
    if (!follow && points.length > 1)
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
  };
  return (
    <View>
      <MapView
        ref={map}
        style={{ width: "100%", height }}
        initialRegion={{
          ...center,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        onMapReady={fit}
        userInterfaceStyle={theme}
        showsUserLocation={false}
        showsMyLocationButton={false}
        accessibilityLabel={
          follow ? "Kart som følger posisjonen din" : "Kart over ruten din"
        }
      >
        {hasMapbox && (
          <UrlTile urlTemplate={mapTiles} maximumZ={19} tileSize={256} />
        )}
        {route
          .filter((s) => s.length > 1)
          .map((s, i) => (
            <Polyline
              key={i}
              coordinates={s}
              strokeColor="#356618"
              strokeWidth={5}
            />
          ))}
        {overlays.flatMap((r) =>
          routeSegments(r.points).map((s, i) => (
            <Polyline
              key={`${r.id}-${i}`}
              coordinates={s}
              strokeColor={r.color}
              strokeWidth={5}
            />
          )),
        )}
        {start && (
          <Marker coordinate={start} title="Start" pinColor="#356618" />
        )}
        {overlays
          .filter((r) => r.points.length)
          .map((r) => (
            <Marker
              key={r.id}
              coordinate={r.points[0]}
              title={r.owner || r.name}
              description={r.name}
              pinColor={r.color}
            />
          ))}
        {position && follow && (
          <Marker
            coordinate={position}
            title="Din posisjon"
            pinColor="#4777CC"
          />
        )}
      </MapView>
      {hasMapbox && (
        <View>
          <Txt size={10}>© Mapbox © OpenStreetMap</Txt>
        </View>
      )}
    </View>
  );
}
