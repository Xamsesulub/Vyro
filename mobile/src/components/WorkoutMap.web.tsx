import { useMemo } from "react";
import LiveMap from "./LiveMap";
import { routeSegments } from "../features/tracking/gps";
import { MapPoint, MapRoute } from "../features/maps/config";
const empty: MapRoute[] = [];
const emptyPoints: MapPoint[] = [];
export default function WorkoutMap({
  height = 300,
  points = emptyPoints,
  routes = empty,
}: {
  height?: number;
  points?: MapPoint[];
  routes?: MapRoute[];
}) {
  const segments = useMemo(
    () => (routes.length ? [] : routeSegments(points)),
    [points, routes],
  );
  return <LiveMap height={height} route={segments} overlays={routes} />;
}
