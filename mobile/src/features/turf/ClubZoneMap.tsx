import { useEffect, useMemo, useRef, useState } from "react";
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { appleInitialRegion } from "../maps/appleGeometry";
import type { MapPoint } from "../maps/config";
import type { ClubTurf } from "./clubApi";
import { zoneShapes, type ZoneShape } from "./zoneGeometry";
import { ZonePin } from "./ZonePin";

export type ClubZoneMapProps = {
  turfs: ClubTurf[];
  selected?: string;
  onSelect: (id: string) => void;
  satellite: boolean;
  recenter: number;
  target?: MapPoint | null;
};
const padding = { top: 95, bottom: 190, left: 65, right: 65 };
export default function ClubZoneMap({
  turfs,
  selected,
  onSelect,
  satellite,
  recenter,
  target,
}: ClubZoneMapProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const shapes = useMemo(() => zoneShapes(turfs), [turfs]);
  const coordinates = useMemo(
    () => shapes.flatMap((s) => s.turf.route),
    [shapes],
  );
  const [initialRegion] = useState(() =>
    appleInitialRegion(coordinates, target ?? null),
  );
  useEffect(() => {
    if (!ready) return;
    if (target)
      map.current?.animateToRegion(appleInitialRegion([], target), 300);
    else if (coordinates.length)
      map.current?.fitToCoordinates(coordinates, {
        edgePadding: padding,
        animated: true,
      });
  }, [ready, coordinates, recenter, target]);
  return (
    <MapView
      ref={map}
      style={{ flex: 1 }}
      provider={PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      mapType={satellite ? "hybrid" : "standard"}
      userInterfaceStyle="light"
      pitchEnabled={false}
      rotateEnabled={false}
      showsCompass={false}
      showsPointsOfInterests={false}
      onMapReady={() => setReady(true)}
      legalLabelInsets={{ top: 0, right: 0, bottom: 190, left: 8 }}
    >
      {shapes.map((shape) => (
        <Polygon
          key={`area-${shape.turf.id}`}
          coordinates={shape.area}
          fillColor={`${shape.color}38`}
          strokeColor={`${shape.color}BB`}
          strokeWidth={2}
          tappable
          onPress={() => onSelect(shape.turf.id)}
        />
      ))}
      {shapes.map((shape) => (
        <Polyline
          key={`route-${shape.turf.id}`}
          coordinates={shape.turf.route}
          strokeColor={shape.color}
          strokeWidth={shape.turf.id === selected ? 4 : 2}
          lineCap="round"
        />
      ))}
      {shapes.map((shape) => (
        <OwnerMarker
          key={shape.turf.id}
          shape={shape}
          selected={shape.turf.id === selected}
          onPress={() => onSelect(shape.turf.id)}
        />
      ))}
    </MapView>
  );
}
function OwnerMarker({
  shape,
  selected,
  onPress,
}: {
  shape: ZoneShape;
  selected: boolean;
  onPress: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const version = `${selected}:${revision}:${shape.turf.profiles?.avatar_path ?? ""}:${shape.turf.profiles?.display_name ?? ""}`;
  const [rendered, setRendered] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setRendered(version), 800);
    return () => clearTimeout(timer);
  }, [version]);
  return (
    <Marker
      coordinate={shape.anchor}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      tracksViewChanges={rendered !== version}
      zIndex={selected ? 20 : 10}
    >
      <ZonePin
        name={shape.turf.profiles?.display_name ?? "Medlem"}
        path={shape.turf.profiles?.avatar_path}
        color={shape.color}
        selected={selected}
        onReady={() => setRevision((n) => n + 1)}
      />
    </Marker>
  );
}
