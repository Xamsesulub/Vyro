import Constants, { ExecutionEnvironment } from "expo-constants";
import type { LiveMapProps } from "../features/maps/geometry";
import { hasMapbox } from "../features/maps/config";
import MapUnavailable from "./MapUnavailable";
export type { LiveMapProps } from "../features/maps/geometry";
export default function LiveMap(props: LiveMapProps) {
  if (!hasMapbox) return <MapUnavailable height={props.height} />;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return (
      <MapUnavailable
        height={props.height}
        message="Mapbox krever utviklingsversjonen av VYRO. Kartet støttes ikke i Expo Go."
      />
    );
  // Avoid loading native bindings in Expo Go; GPS still comes from LocationWatcher.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NativeMap = require("./MapboxNative").default;
  return <NativeMap {...props} />;
}
