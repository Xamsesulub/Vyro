import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { View } from "react-native";
import { demoRoute } from "../features/tracking/simulator";
import { useAppStore } from "../stores/useAppStore";
import {
  hasMapbox,
  mapTiles,
  MapPoint,
  MapRoute,
} from "../features/maps/config";
import { Txt } from "./ui";
export default function WorkoutMap({
  height = 300,
  points = demoRoute,
  routes = [],
}: {
  height?: number;
  points?: MapPoint[];
  routes?: MapRoute[];
}) {
  const theme = useAppStore((s) => s.theme);
  const lines = routes.length
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
  return (
    <View>
      <MapView
        style={{ width: "100%", height }}
        initialRegion={{
          latitude: points[0]?.latitude ?? 59.931,
          longitude: points[0]?.longitude ?? 10.759,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        userInterfaceStyle={theme}
        showsUserLocation={false}
        accessibilityLabel="Kart med løype"
      >
        {hasMapbox && (
          <UrlTile urlTemplate={mapTiles} maximumZ={19} tileSize={256} />
        )}
        {lines.map((line) => (
          <Polyline
            key={line.id}
            coordinates={line.points}
            strokeColor={line.color}
            strokeWidth={5}
          />
        ))}
        {lines
          .filter((line) => line.points.length > 0)
          .map((line) => (
            <Marker
              key={line.id}
              coordinate={line.points[0]}
              title={line.owner || line.name}
              description={line.name}
              pinColor={line.color}
            />
          ))}
      </MapView>
      {hasMapbox && (
        <Txt size={10} muted>
          © Mapbox © OpenStreetMap
        </Txt>
      )}
    </View>
  );
}
