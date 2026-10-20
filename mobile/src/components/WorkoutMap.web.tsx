import { useMemo } from "react";
import LiveMap from "./LiveMap";
import { demoRoute } from "../features/tracking/simulator";
import { routeSegments } from "../features/tracking/gps";
import { MapPoint, MapRoute } from "../features/maps/config";
const empty: MapRoute[] = [];
export default function WorkoutMap({
  height = 300,
  points = demoRoute,
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
