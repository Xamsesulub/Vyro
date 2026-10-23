import { useEffect, useMemo, useRef, useState } from "react";
import Mapbox from "@rnmapbox/maps";
import { View } from "react-native";
import { mapboxToken, createMapStyle } from "../features/maps/config";
import {
  emptyRoute,
  emptyOverlays,
  mapFeatures,
  mapBounds,
  type LiveMapProps,
} from "../features/maps/geometry";
import { MapLoadNotice } from "./MapLoadNotice";
import { useMapRecovery } from "../features/maps/useMapRecovery";
Mapbox.setAccessToken(mapboxToken);
export default function MapboxNative({
  height = 300,
  attributionBottom = 0,
  mapKind = "standard",
  poi = true,
  contours = false,
  threeD = false,
  north = 0,
  target = null,
  route = emptyRoute,
  overlays = emptyOverlays,
  position = null,
  follow = false,
  explorer = false,
  recenter = 0,
  padding,
  onPan,
}: LiveMapProps) {
  const base = mapKind === "standard" ? "standard" : "satellite";
  const { attempt, failure, reportFailure, retry } = useMapRecovery(base);
  const mapStyle = useMemo(
    () => createMapStyle(base, false, false, false),
    [base],
  );
  const config = useMemo(
    () => createMapStyle(mapKind, poi, false, threeD).imports?.[0]?.config,
    [mapKind, poi, threeD],
  );
  const skipFit = useRef(false);
  const camera = useRef<Mapbox.Camera>(null);
  const [ready, setReady] = useState(0);
  const [initialCamera, setInitialCamera] = useState({
    centerCoordinate: [10.7522, 59.9139],
    zoomLevel: 12,
    pitch: 0,
    heading: 0,
  });
  const lastCamera = useRef(initialCamera);
  const retryPending = useRef(false);
  const preserveCamera = useRef(false);
  const shape = useMemo(
    () => mapFeatures(route, overlays, position),
    [route, overlays, position],
  );
  const cameraPosition = follow ? position : null;
  const bounds = useMemo(() => mapBounds(route, overlays), [route, overlays]);
  useEffect(() => {
    if (!ready) return;
    if (preserveCamera.current) {
      preserveCamera.current = false;
      return;
    }
    if (skipFit.current && !follow) {
      skipFit.current = false;
      return;
    }
    if (cameraPosition)
      camera.current?.setCamera({
        centerCoordinate: [cameraPosition.longitude, cameraPosition.latitude],
        zoomLevel: 16,
        animationDuration: 500,
      });
    else if (target)
      camera.current?.setCamera({
        centerCoordinate: [target.longitude, target.latitude],
        zoomLevel: 13,
        animationDuration: 500,
      });
    else if (bounds)
      camera.current?.fitBounds(
        bounds.ne,
        bounds.sw,
        padding
          ? [padding.top, padding.right, padding.bottom, padding.left]
          : 40,
        0,
      );
  }, [ready, follow, cameraPosition, bounds, recenter, padding, target]);
  useEffect(() => {
    if (ready)
      camera.current?.setCamera({
        pitch: threeD ? 55 : 0,
        animationDuration: 400,
      });
  }, [threeD, ready]);
  useEffect(() => {
    camera.current?.setCamera({ heading: 0, animationDuration: 400 });
  }, [north]);
  return (
    <View>
      <Mapbox.MapView
        key={attempt}
        style={{ height, width: "100%" }}
        styleJSON={JSON.stringify(mapStyle)}
        scaleBarEnabled={false}
        logoPosition={{ left: 8, bottom: attributionBottom + 8 }}
        attributionPosition={{ right: 8, bottom: attributionBottom + 8 }}
        onCameraChanged={(event) => {
          lastCamera.current = {
            centerCoordinate: event.properties.center,
            zoomLevel: event.properties.zoom,
            pitch: event.properties.pitch,
            heading: event.properties.heading,
          };
          if (event.gestures.isGestureActive) {
            if (follow) skipFit.current = true;
            onPan?.();
          }
        }}
        onDidFinishLoadingStyle={() => {
          preserveCamera.current = retryPending.current;
          retryPending.current = false;
          setReady((v) => v + 1);
        }}
        onMapLoadingError={reportFailure}
      >
        {config && (
          <Mapbox.StyleImport
            id="basemap"
            existing
            config={config as Record<string, string | boolean>}
          />
        )}
        {contours && (
          <Mapbox.VectorSource
            id="terrainContours"
            url="mapbox://mapbox.mapbox-terrain-v2"
          >
            <Mapbox.LineLayer
              id="terrain-contours"
              sourceLayerID="contour"
              slot="middle"
              minZoomLevel={12}
              style={{
                lineColor: "#8C8466",
                lineWidth: 0.7,
                lineOpacity: 0.35,
              }}
            />
          </Mapbox.VectorSource>
        )}
        {threeD && (
          <Mapbox.RasterDemSource
            id="terrainDem"
            url="mapbox://mapbox.mapbox-terrain-dem-v1"
            tileSize={512}
            maxZoomLevel={14}
          >
            <Mapbox.Terrain sourceID="terrainDem" style={{ exaggeration: 1 }} />
          </Mapbox.RasterDemSource>
        )}
        <Mapbox.Camera ref={camera} defaultSettings={initialCamera} />
        <Mapbox.ShapeSource id="workout" shape={shape}>
          <Mapbox.LineLayer
            id="route-outline"
            slot="top"
            filter={["==", ["geometry-type"], "LineString"]}
            style={{
              lineColor: "white",
              lineWidth: 9,
              lineOpacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Mapbox.LineLayer
            id="route"
            slot="top"
            filter={["==", ["geometry-type"], "LineString"]}
            style={{
              lineColor: ["get", "color"],
              lineWidth: 5,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Mapbox.CircleLayer
            id="position-aura"
            slot="top"
            filter={["==", ["get", "kind"], "position"]}
            style={{
              circleColor: "#1689F8",
              circleRadius: 19,
              circleOpacity: 0.18,
            }}
          />
          <Mapbox.CircleLayer
            id="points"
            slot="top"
            filter={["==", ["geometry-type"], "Point"]}
            style={{
              circleColor: ["get", "color"],
              circleRadius: ["case", ["==", ["get", "kind"], "position"], 9, 7],
              circleStrokeColor: "white",
              circleStrokeWidth: 2,
            }}
          />
          <Mapbox.SymbolLayer
            id="names"
            slot="top"
            filter={["==", ["geometry-type"], "Point"]}
            style={{
              textField: ["get", "label"],
              textSize: 12,
              textOffset: [0, 1.5],
              textColor: "#11182C",
              textHaloColor: "white",
              textHaloWidth: 2,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
      {failure && (
        <MapLoadNotice
          message={failure.message}
          imagery={base === "satellite"}
          retryAt={failure.retryAt}
          onRetry={() => {
            if (!retry()) return;
            setInitialCamera(lastCamera.current);
            retryPending.current = true;
          }}
          top={explorer ? (padding?.top ?? 150) + 12 : 12}
          explorer={explorer}
        />
      )}
    </View>
  );
}
