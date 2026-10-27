import { useEffect, useMemo, useRef, useState } from "react";
import type { Map, GeoJSONSource } from "mapbox-gl-v3";
import "mapbox-gl-v3/dist/mapbox-gl.css";
import { View } from "react-native";
import {
  hasMapbox,
  mapboxToken,
  createMapStyle,
} from "../features/maps/config";
import {
  mapFeatures,
  mapBounds,
  emptyRoute,
  emptyOverlays,
  type LiveMapProps,
} from "../features/maps/geometry";
import { loadMapEngine } from "../features/maps/prewarm.web";
import { applyMapOptions } from "../features/maps/options.web";
import MapUnavailable from "./MapUnavailable";
import { MapLoadNotice } from "./MapLoadNotice";
import { useMapRecovery } from "../features/maps/useMapRecovery";
export default function LiveMap({
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
  heatmap,
}: LiveMapProps) {
  // Satellite and Hybrid share imagery; toggling labels must not reload tiles.
  const base = mapKind === "standard" ? "standard" : "satellite";
  const { attempt, failure, reportFailure, retry } = useMapRecovery(base);
  const errorReporter = useRef(reportFailure);
  useEffect(() => {
    errorReporter.current = reportFailure;
  }, [reportFailure]);
  const mapStyle = useMemo(
    () => createMapStyle(base, false, false, false),
    [base],
  );
  const initialStyle = useRef(mapStyle);
  const loadedStyle = useRef<typeof mapStyle | null>(null);
  const options = useRef({ mapKind, poi, contours, threeD });
  const initialBounds = useRef(mapBounds(route, overlays));
  const firstPosition = follow ? position : target;
  const initialPadding = useRef(padding);
  const initialCamera = useRef<{
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  } | null>(
    firstPosition
      ? {
          center: [firstPosition.longitude, firstPosition.latitude],
          zoom: follow ? 16 : 13,
          pitch: threeD ? 55 : 0,
          bearing: 0,
        }
      : null,
  );
  useEffect(() => {
    options.current = { mapKind, poi, contours, threeD };
  }, [mapKind, poi, contours, threeD]);
  const skipFit = useRef(false);
  const following = useRef(follow);
  const panCallback = useRef(onPan);
  useEffect(() => {
    panCallback.current = onPan;
    following.current = follow;
  }, [onPan, follow]);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [ready, setReady] = useState(0);
  const retryPending = useRef(false);
  const preserveCamera = useRef(false);
  useEffect(() => {
    el.current
      ?.querySelectorAll<HTMLElement>(
        ".mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right",
      )
      .forEach((node) => {
        node.style.bottom = `${attributionBottom}px`;
      });
  }, [ready, attributionBottom]);
  const shape = useMemo(
    () => mapFeatures(route, overlays, position),
    [route, overlays, position],
  );
  const cameraPosition = follow ? position : null;
  const bounds = useMemo(() => mapBounds(route, overlays), [route, overlays]);
  useEffect(() => {
    if (!hasMapbox) return;
    let cancelled = false;
    let instance: Map | undefined;
    let observer: ResizeObserver | undefined;
    loadMapEngine()
      .then(({ default: gl }) => {
        if (cancelled || !el.current) return;
        instance = new gl.Map({
          container: el.current,
          accessToken: mapboxToken,
          style: initialStyle.current,
          center: [10.7522, 59.9139],
          zoom: 12,
          pitch: 0,
          ...(initialBounds.current && !initialCamera.current
            ? {
                bounds: [
                  initialBounds.current.sw,
                  initialBounds.current.ne,
                ] as [[number, number], [number, number]],
                fitBoundsOptions: {
                  padding: initialPadding.current ?? 40,
                  maxZoom: 17,
                },
              }
            : {}),
          ...initialCamera.current,
        });
        map.current = instance;
        instance.on("dragstart", () => {
          if (following.current) skipFit.current = true;
          panCallback.current?.();
        });
        if (!explorer)
          instance.addControl(
            new gl.NavigationControl({ showCompass: false }),
            "top-left",
          );
        instance.on("error", (event) => {
          if (!cancelled) errorReporter.current(event.error);
        });
        instance.on("style.load", () => {
          if (cancelled || !instance) return;
          loadedStyle.current = initialStyle.current;
          applyMapOptions(instance, options.current);
          instance.addSource("workout", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          instance.addLayer({
            id: "route-outline",
            type: "line",
            source: "workout",
            slot: "top",
            filter: ["==", ["geometry-type"], "LineString"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "white",
              "line-width": 9,
              "line-opacity": 0.95,
            },
          });
          instance.addLayer({
            id: "route",
            type: "line",
            source: "workout",
            slot: "top",
            filter: ["==", ["geometry-type"], "LineString"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": ["get", "color"], "line-width": 5 },
          });
          instance.addLayer({
            id: "position-aura",
            type: "circle",
            source: "workout",
            slot: "top",
            filter: ["==", ["get", "kind"], "position"],
            paint: {
              "circle-color": "#1689F8",
              "circle-radius": 19,
              "circle-opacity": 0.18,
            },
          });
          instance.addLayer({
            id: "points",
            type: "circle",
            source: "workout",
            slot: "top",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-color": ["get", "color"],
              "circle-radius": [
                "case",
                ["==", ["get", "kind"], "position"],
                9,
                7,
              ],
              "circle-stroke-color": "white",
              "circle-stroke-width": 2,
            },
          });
          instance.addLayer({
            id: "names",
            type: "symbol",
            source: "workout",
            slot: "top",
            filter: ["==", ["geometry-type"], "Point"],
            layout: {
              "text-field": ["get", "label"],
              "text-size": 12,
              "text-offset": [0, 1.5],
            },
            paint: {
              "text-color": "#11182C",
              "text-halo-color": "white",
              "text-halo-width": 2,
            },
          });
          preserveCamera.current = retryPending.current;
          retryPending.current = false;
          setReady((v) => v + 1);
        });
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(el.current);
      })
      .catch(() => {
        if (!cancelled) errorReporter.current(null);
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      instance?.remove();
      map.current = null;
      loadedStyle.current = null;
    };
  }, [explorer, attempt]);
  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource("workout") as GeoJSONSource)?.setData(shape);
  }, [ready, shape]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !instance.getSource("workout")) return;
    for (const id of ["route-outline", "route", "points", "names"])
      instance.setLayoutProperty(
        id,
        "visibility",
        heatmap ? "none" : "visible",
      );
    if (instance.getLayer("football-heatmap"))
      instance.removeLayer("football-heatmap");
    if (instance.getSource("football-heatmap"))
      instance.removeSource("football-heatmap");
    if (heatmap) {
      const [[north, east], [south, west]] = heatmap.bounds;
      instance.addSource("football-heatmap", {
        type: "image",
        url: heatmap.uri,
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      });
      instance.addLayer({
        id: "football-heatmap",
        type: "raster",
        source: "football-heatmap",
        slot: "top",
        paint: { "raster-fade-duration": 0 },
      });
    }
  }, [ready, heatmap]);
  useEffect(() => {
    if (!ready || !map.current) return;
    if (preserveCamera.current) {
      preserveCamera.current = false;
      return;
    }
    if (skipFit.current && !follow) {
      skipFit.current = false;
      return;
    }
    if (cameraPosition)
      map.current.easeTo({
        center: [cameraPosition.longitude, cameraPosition.latitude],
        zoom: 16,
        duration: 500,
      });
    else if (target)
      map.current.easeTo({
        center: [target.longitude, target.latitude],
        zoom: 13,
        duration: 500,
      });
    else if (bounds)
      map.current.fitBounds(
        [bounds.sw as [number, number], bounds.ne as [number, number]],
        { padding: padding ?? 40, maxZoom: 17, duration: 0 },
      );
  }, [ready, bounds, follow, cameraPosition, recenter, padding, target]);
  useEffect(() => {
    // The engine loads asynchronously. Honour a selection made before it resolves.
    initialStyle.current = mapStyle;
    if (map.current) {
      loadedStyle.current = null;
      map.current.setStyle(mapStyle, {
        diff: false,
        localFontFamily: undefined,
        localIdeographFontFamily: undefined,
      });
    }
  }, [mapStyle]);
  useEffect(() => {
    // isStyleLoaded also waits for tiles. Options must still apply while tiles
    // are loading (or rate-limited), once the style's imports are available.
    if (map.current && loadedStyle.current === mapStyle)
      applyMapOptions(map.current, { mapKind, poi, contours, threeD });
  }, [ready, mapStyle, mapKind, poi, contours, threeD]);
  useEffect(() => {
    if (ready) map.current?.easeTo({ pitch: threeD ? 55 : 0, duration: 400 });
  }, [threeD, ready]);
  useEffect(() => {
    map.current?.easeTo({ bearing: 0, duration: 400 });
  }, [north]);
  if (!hasMapbox) return <MapUnavailable height={height} />;
  return (
    <View>
      <div
        ref={el}
        role="region"
        aria-label="Mapbox-kart"
        style={{ height, width: "100%", background: "#F4F5F2" }}
      />
      {failure && (
        <MapLoadNotice
          message={failure.message}
          imagery={base === "satellite"}
          retryAt={failure.retryAt}
          onRetry={() => {
            if (!retry()) return;
            // Recreate even after an engine-load failure; preserve the user's view.
            if (map.current) {
              const center = map.current.getCenter();
              initialCamera.current = {
                center: [center.lng, center.lat],
                zoom: map.current.getZoom(),
                pitch: map.current.getPitch(),
                bearing: map.current.getBearing(),
              };
            }
            retryPending.current = true;
          }}
          top={explorer ? (padding?.top ?? 150) + 12 : 12}
          explorer={explorer}
        />
      )}
    </View>
  );
}
