import MapView, { Marker, Polyline } from "react-native-maps";
import { demoRoute } from "../features/tracking/simulator";
export default function WorkoutMap({ height = 300 }: { height?: number }) {
  return (
    <MapView
      style={{ width: "100%", height }}
      initialRegion={{
        latitude: 59.931,
        longitude: 10.759,
        latitudeDelta: 0.028,
        longitudeDelta: 0.028,
      }}
      userInterfaceStyle="dark"
      showsUserLocation={false}
      accessibilityLabel="Kart over Oslo med en illustrert eksempelrute"
    >
      <Polyline coordinates={demoRoute} strokeColor="#B2FF78" strokeWidth={5} />
      <Marker
        coordinate={demoRoute[0]}
        title="Simulert start"
        pinColor="#B2FF78"
      />
      <Marker
        coordinate={demoRoute[demoRoute.length - 1]}
        title="Eksempelrutens slutt"
        pinColor="#B7A4FF"
      />
    </MapView>
  );
}
