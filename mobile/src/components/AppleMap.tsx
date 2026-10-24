import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import {
  appleInitialRegion,
  appleMapGeometry,
} from "../features/maps/appleGeometry";
import {
  emptyOverlays,
  emptyRoute,
  type LiveMapProps,
} from "../features/maps/geometry";

const defaultPadding = { top: 40, right: 40, bottom: 40, left: 40 };

export default function AppleMap({
  height = 300,
  attributionBottom = 0,
  mapKind = "standard",
  poi = true,
  threeD = false,
  north = 0,
  target = null,
  route = emptyRoute,
  overlays = emptyOverlays,
  position = null,
  follow = false,
  explorer = false,
  recenter = 0,
  padding = defaultPadding,
  onPan,
}: LiveMapProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const panned = useRef(false);
  const geometry = useMemo(
    () => appleMapGeometry(route, overlays),
    [route, overlays],
  );
  const [initialRegion] = useState(() =>
    appleInitialRegion(
      geometry.coordinates,
      follow && position ? position : target,
    ),
  );
  const overlayIds = overlays.map((overlay) => overlay.id).join("|");
  const focus = follow ? position : null;
  const previous = useRef({
    follow,
    recenter,
    target,
    overlayIds,
    focused: !!focus,
    ready: false,
  });

  useEffect(() => {
    if (!ready) return;
    const last = previous.current;
    const reset =
      !last.ready ||
      recenter !== last.recenter ||
      (follow && !last.follow) ||
      (!!focus && !last.focused) ||
      overlayIds !== last.overlayIds ||
      target !== last.target;
    previous.current = {
      follow,
      recenter,
      target,
      overlayIds,
      focused: !!focus,
      ready,
    };
    if (reset) panned.current = false;
    // Dragging stops follow immediately, including fixes arriving before the
    // parent processes onPan. Do not fit a growing route behind the user's back.
    if (panned.current) return;
    if (focus) {
      map.current?.animateCamera({
        center: focus,
        ...(reset ? { altitude: 700 } : {}),
      });
    } else if (target) {
      map.current?.animateCamera({ center: target, altitude: 5000 });
    } else if (geometry.coordinates.length > 1) {
      map.current?.fitToCoordinates(geometry.coordinates, {
        edgePadding: padding,
        animated: false,
      });
    } else if (geometry.coordinates[0]) {
      map.current?.animateCamera({
        center: geometry.coordinates[0],
        altitude: 700,
      });
    }
  }, [
    ready,
    focus,
    follow,
    recenter,
    target,
    overlayIds,
    geometry.coordinates,
    padding,
  ]);

  useEffect(() => {
    if (ready) map.current?.animateCamera({ pitch: threeD ? 55 : 0 });
  }, [ready, threeD]);
  useEffect(() => {
    if (ready) map.current?.animateCamera({ heading: 0 });
  }, [ready, north]);

  return (
    <MapView
      ref={map}
      testID="apple-map"
      accessibilityLabel="Apple-kart"
      style={{ height, width: "100%" }}
      provider={PROVIDER_DEFAULT}
      mapType={mapKind}
      initialRegion={initialRegion}
      userInterfaceStyle="light"
      showsPointsOfInterests={mapKind !== "satellite" && poi}
      showsBuildings={threeD}
      showsCompass={!explorer}
      showsScale={false}
      showsTraffic={false}
      showsUserLocation={false}
      showsMyLocationButton={false}
      loadingEnabled
      loadingIndicatorColor="#356B15"
      loadingBackgroundColor="#F4F5F2"
      legalLabelInsets={{
        top: 0,
        right: 8,
        bottom: attributionBottom + 8,
        left: 0,
      }}
      appleLogoInsets={{
        top: 0,
        right: 0,
        bottom: attributionBottom + 8,
        left: 8,
      }}
      cameraZoomRange={{ minCenterCoordinateDistance: 100 }}
      onMapReady={() => setReady(true)}
      onPanDrag={() => {
        // Embedded workout maps keep following the next fix when they have
        // no external follow/recenter controls. Explorer lets the user pan.
        panned.current = !follow || !!onPan;
        onPan?.();
      }}
    >
      {geometry.lines.map((line) => (
        <Polyline
          key={`${line.id}-outline`}
          coordinates={line.coordinates}
          strokeColor="#FFFFFF"
          strokeWidth={9}
          lineCap="round"
          lineJoin="round"
          zIndex={1}
        />
      ))}
      {geometry.lines.map((line) => (
        <Polyline
          key={line.id}
          coordinates={line.coordinates}
          strokeColor={line.color}
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
          zIndex={2}
        />
      ))}
      {geometry.markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={marker.coordinate}
          title={marker.title}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: marker.color,
              borderColor: "white",
              borderWidth: 2,
            }}
          />
        </Marker>
      ))}
      {position && (
        <Marker
          coordinate={position}
          title="Posisjon på kartet"
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          zIndex={3}
        >
          <View
            style={{
              padding: 7,
              borderRadius: 20,
              backgroundColor: "#1689F82E",
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: "#1689F8",
                borderColor: "white",
                borderWidth: 2,
              }}
            />
          </View>
        </Marker>
      )}
    </MapView>
  );
}
