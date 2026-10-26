import type { SuggestedRoute } from "../src/features/routes/model";
export const suggestedRoute: SuggestedRoute = {
  id: "a".repeat(64),
  name: "Rundtur · 5,0 km",
  sport: "Løping",
  route: [
    { latitude: 60.39, longitude: 5.32 },
    { latitude: 60.41, longitude: 5.32 },
    { latitude: 60.39, longitude: 5.32 },
  ],
  distance_m: 5000,
  ascent_m: 42,
  source: "openrouteservice",
  attribution: "© OpenStreetMap contributors · openrouteservice / HeiGIT",
  created_at: "2026-10-26T10:00:00Z",
};
