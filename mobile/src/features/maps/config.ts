export const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
export const hasMapbox = mapboxToken.startsWith("pk.");
export const mapTiles = hasMapbox
  ? `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}?access_token=${encodeURIComponent(mapboxToken)}`
  : "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
export type MapPoint = { latitude: number; longitude: number; breakBefore?: boolean };
export type MapRoute = {
  id: string;
  name: string;
  owner: string;
  points: MapPoint[];
  color: string;
};
