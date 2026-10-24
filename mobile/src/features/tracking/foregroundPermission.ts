import * as Location from "expo-location";
import { locationDeadline } from "./locationDeadline";

export function requestForegroundPermission() {
  return locationDeadline(Location.requestForegroundPermissionsAsync());
}
