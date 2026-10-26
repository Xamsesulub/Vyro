import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  type Camera,
} from "react-native-maps";
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
  const frame = appleInitialRegion(geometry.coordinates, null);
  const frameKey = geometry.coordinates.length
    ? `${frame.latitude}:${frame.longitude}:${frame.latitudeDelta}:${frame.longitudeDelta}`
    : "";
  const paddingKey = `${padding.top}:${padding.right}:${padding.bottom}:${padding.left}`;
  const cameraRequest = useRef(0);
  // Keep native mode props unchanged until we have captured the old camera.
  // Disabling pitch or leaving Flyover can itself change MapKit's altitude.
  const [presentation, setPresentation] = useState<{
    threeD: boolean;
    mapKind: typeof mapKind;
    camera?: Partial<Camera>;
    sequence: number;
  }>({ threeD, mapKind, sequence: 0 });
  useLayoutEffect(() => {
    if (
      presentation.camera &&
      cameraRequest.current === presentation.sequence
    ) {
      // Native props have now committed. Restore the captured view afterwards.
      map.current?.setCamera(presentation.camera);
    }
  }, [presentation]);
  const previous = useRef({
    follow,
    recenter,
    target,
    overlayIds,
    focus,
    frameKey,
    paddingKey,
    threeD,
    mapKind,
    north,
    ready: false,
  });

  useEffect(() => {
    if (!ready || !map.current) return;
    const last = previous.current;
    const reset =
      !last.ready ||
      recenter !== last.recenter ||
      (follow && !last.follow) ||
      (!!focus && !last.focus) ||
      overlayIds !== last.overlayIds ||
      target !== last.target;
    const orientationChanged =
      !last.ready ||
      threeD !== last.threeD ||
      mapKind !== last.mapKind ||
      threeD !== presentation.threeD ||
      mapKind !== presentation.mapKind ||
      north !== last.north;
    const northChanged = !last.ready || north !== last.north;
    const frameChanged =
      frameKey !== last.frameKey || paddingKey !== last.paddingKey;
    const moved =
      focus?.latitude !== last.focus?.latitude ||
      focus?.longitude !== last.focus?.longitude;
    previous.current = {
      follow,
      recenter,
      target,
      overlayIds,
      focus,
      frameKey,
      paddingKey,
      threeD,
      mapKind,
      north,
      ready,
    };
    if (reset) panned.current = false;
    // Camera orientation is independent of framing. Equivalent route/padding
    // objects and changing 2D/3D must never fit the route again.
    const reposition =
      !panned.current && (reset || (focus ? moved : frameChanged));
    if (!reposition && !orientationChanged) return;
    const view = map.current;
    const sequence = ++cameraRequest.current;
    let center = undefined;
    let altitude = undefined;
    let fitted = false;
    if (reposition) {
      if (focus) {
        center = focus;
        if (reset) altitude = 700;
      } else if (target) {
        center = target;
        if (reset) altitude = 5000;
      } else if (geometry.coordinates.length > 1) {
        view.fitToCoordinates(geometry.coordinates, {
          edgePadding: padding,
          animated: false,
        });
        fitted = true;
      } else if (geometry.coordinates[0]) {
        center = geometry.coordinates[0];
        altitude = 700;
      }
    }
    // Capture before changing native map type/pitchEnabled, then restore after
    // those props commit. Reading after that change captures MapKit's reset zoom.
    // New requests/pans/unmount invalidate old reads.
    const active = () => cameraRequest.current === sequence;
    const changes = {
      ...(center ? { center } : {}),
      ...(altitude !== undefined ? { altitude } : {}),
      pitch: threeD ? 55 : 0,
      ...(northChanged ? { heading: 0 } : {}),
    };
    const apply = (camera: Partial<Camera>) => {
      if (!active()) return;
      if (threeD !== presentation.threeD || mapKind !== presentation.mapKind) {
        setPresentation({ threeD, mapKind, camera, sequence });
      } else if (orientationChanged || fitted) view.setCamera(camera);
      else view.animateCamera(camera);
    };
    void view
      .getCamera()
      .then((camera) => {
        apply({ ...camera, ...changes });
      })
      .catch(() => {
        // Preserve native camera fields if a read fails, without a default zoom.
        apply(changes);
      });
  }, [
    ready,
    focus,
    follow,
    recenter,
    target,
    overlayIds,
    frameKey,
    paddingKey,
    geometry.coordinates,
    padding,
    threeD,
    mapKind,
    north,
    presentation,
  ]);

  useEffect(
    () => () => {
      cameraRequest.current++;
      previous.current.ready = false;
    },
    [],
  );

  return (
    <MapView
      ref={map}
      testID="apple-map"
      accessibilityLabel="Apple-kart"
      style={{ height, width: "100%" }}
      provider={PROVIDER_DEFAULT}
      mapType={
        presentation.threeD && presentation.mapKind !== "standard"
          ? `${presentation.mapKind}Flyover`
          : presentation.mapKind
      }
      pitchEnabled={presentation.threeD}
      initialRegion={initialRegion}
      userInterfaceStyle="light"
      showsPointsOfInterests={presentation.mapKind !== "satellite" && poi}
      showsBuildings={presentation.threeD}
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
        cameraRequest.current++;
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
