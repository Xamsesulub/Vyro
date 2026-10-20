import { useEffect, useRef } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { Coord } from "../features/tracking/gps";
import { brand } from "../theme/tokens";

export type LiveMapProps = {
  height?: number;
  route?: Coord[][];
  position?: Coord | null;
  // Keep the camera on `position` as it moves.
  follow?: boolean;
};
const oslo = { latitude: 59.9139, longitude: 10.7522 };

export default function LiveMap({
  height = 300,
  route = [],
  position = null,
  follow = false,
}: LiveMapProps) {
  const map = useRef<MapView>(null);
  const points = route.flat();
  const start = points[0];
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
    <MapView
      ref={map}
      style={{ width: "100%", height }}
      initialRegion={{
        ...center,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }}
      onMapReady={fit}
      userInterfaceStyle="dark"
      showsUserLocation={follow}
      showsMyLocationButton={false}
      accessibilityLabel={
        follow ? "Kart som følger posisjonen din" : "Kart over ruten din"
      }
    >
      {route
        .filter((segment) => segment.length > 1)
        .map((segment, i) => (
          <Polyline
            key={i}
            coordinates={segment}
            strokeColor={brand.lime}
            strokeWidth={5}
          />
        ))}
      {start && (
        <Marker coordinate={start} title="Start" pinColor={brand.lime} />
      )}
    </MapView>
  );
}
