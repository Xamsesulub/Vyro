import "react-native-url-polyfill/auto";
import { createClient, type Session } from "@supabase/supabase-js";
import * as social from "../src/features/social/api";
import {
  searchRoutes,
  loadSavedRoutes,
  saveRoute,
  unsaveRoute,
  contributeRoute,
} from "../src/features/routes/api";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useAppStore, appPersistence } from "../src/stores/useAppStore";
import { useRouteLibrary } from "../src/stores/useRouteLibrary";
import { initialRecording } from "../src/features/tracking/simulator";
import { suggestedRoute } from "./routes-fixture";
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
let calls: { url: URL; body: any }[];
let session: Session;
let response: unknown;
const originalFetch = global.fetch;
beforeEach(() => {
  calls = [];
  response = [];
  session = { user: { id: "owner" }, access_token: "user-token" } as Session;
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_KEY = "public-test-key";
  useAuthStore.setState({ ready: true, session });
  useAppStore.setState({ recording: initialRecording, workouts: [] });
  useRouteLibrary.setState({ entries: [] });
  const fetcher = (async (input, init) => {
    calls.push({
      url: new URL(String(input)),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  global.fetch = fetcher;
  const db = createClient("https://fixture.supabase.co", "test", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetcher },
  });
  jest
    .spyOn(db.auth, "getSession")
    .mockImplementation(async () => ({ data: { session }, error: null }));
  jest.spyOn(social, "client").mockReturnValue(db);
});
afterEach(async () => {
  await appPersistence.flush();
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});
test("search sends a rounded area and selected filters, never the address or workout data", async () => {
  response = [suggestedRoute];
  const q = {
    latitude: 60.39123,
    longitude: 5.32123,
    sport: "Løping" as const,
    length: 5000,
  };
  expect(await searchRoutes("owner", q, new AbortController().signal)).toEqual([
    suggestedRoute,
  ]);
  expect(calls[0].body).toEqual({
    p_latitude: 60.392,
    p_longitude: 5.322,
    p_sport: "Løping",
    p_length: 5000,
  });
  expect(calls[0].url.pathname).toBe("/rest/v1/rpc/search_community_routes");
});
test("account changes prevent stale requests and reject responses for the previous account", async () => {
  useAuthStore.setState({
    session: { ...session, user: { id: "other" } } as Session,
  });
  await expect(
    searchRoutes(
      "owner",
      { latitude: 60.39, longitude: 5.32, sport: "Løping", length: 5000 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("AUTH_REQUIRED");
  expect(calls).toHaveLength(0);
  useAuthStore.setState({ session: { user: { id: "other" } } as Session });
  await expect(
    saveRoute("owner", suggestedRoute.id, new AbortController().signal),
  ).rejects.toThrow("AUTH_REQUIRED");
  expect(calls).toHaveLength(0);
});
test("cloud bookmarks are scoped to the account, page summaries omit geometry and private titles are restored", async () => {
  response = Array.from({ length: 21 }, (_, i) => ({
    route_id: String(i).padStart(64, "a"),
    created_at: "2026-10-26T10:00:00Z",
    name: `Min løype ${i}`,
    route_suggestions: suggestedRoute,
  }));
  const page = await loadSavedRoutes(
    "owner",
    null,
    new AbortController().signal,
  );
  expect(page.routes).toHaveLength(20);
  expect(page.routes[0].name).toBe("Min løype 0");
  expect(page.next).not.toBeNull();
  expect(calls[0].url.searchParams.get("owner_id")).toBe("eq.owner");
  expect(calls[0].url.searchParams.get("select")).not.toContain(",route,");
  response = null;
  await saveRoute(
    "owner",
    suggestedRoute.id,
    new AbortController().signal,
    " Min tur i Bergen ",
  );
  expect(calls[1].body).toEqual({
    p_route_id: suggestedRoute.id,
    p_name: "Min tur i Bergen",
  });
  response = [];
  await unsaveRoute("owner", suggestedRoute.id, new AbortController().signal);
  expect(calls[2].url.searchParams.get("owner_id")).toBe("eq.owner");
});
test("a planned route is only a guide; it creates no workout, GPS fixes, distance or turf claim", () => {
  expect(useAppStore.getState().planRoute(suggestedRoute, "owner")).toBe(true);
  const state = useAppStore.getState();
  expect(state.recording).toMatchObject({
    status: "idle",
    mode: "gps",
    distance: 0,
    seconds: 0,
    route: [],
    ownerId: "owner",
  });
  expect(state.recording.guide?.route).toEqual(suggestedRoute.route);
  expect(state.recording.challenge).toBeUndefined();
  expect(state.workouts).toHaveLength(0);
  state.event("start");
  expect(useAppStore.getState().planRoute(suggestedRoute, "owner")).toBe(false);
  useAppStore.setState({ recording: initialRecording });
  expect(useAppStore.getState().planRoute(suggestedRoute, "other")).toBe(false);
});
test("offline copies are bounded, remain owner-scoped and removal does not delete another account copy", () => {
  const library = useRouteLibrary.getState();
  library.remember("a", suggestedRoute);
  library.remember("b", suggestedRoute);
  library.forget("a", suggestedRoute.id);
  expect(useRouteLibrary.getState().entries.map((e) => e.ownerId)).toEqual([
    "b",
  ]);
  for (let i = 0; i < 30; i++)
    library.remember("a", {
      ...suggestedRoute,
      id: i.toString(16).padStart(64, "0"),
    });
  expect(useRouteLibrary.getState().entries).toHaveLength(20);
});

test("sharing uploads only the consented, trimmed geometry and no private workout details", async () => {
  const { contributionWorkout } = require("./contribution-fixture");
  const {
    contributionPreview,
  } = require("../src/features/routes/contribution");
  response = suggestedRoute.id;
  expect(
    await contributeRoute(
      "owner",
      contributionWorkout,
      " Elveløypa ",
      " Oslo ",
      true,
      new AbortController().signal,
    ),
  ).toBe(suggestedRoute.id);
  expect(calls[0].body).toEqual({
    p_local_id: contributionWorkout.id,
    p_name: "Elveløypa",
    p_place: "Oslo",
    p_sport: "Løping",
    p_route: contributionPreview(contributionWorkout, "owner").route,
    p_source: "gps",
    p_consent: true,
  });
  expect(calls[0].body.p_route).not.toEqual(contributionWorkout.route);
  expect(calls[0].body).not.toHaveProperty("notes");
  expect(calls[0].body).not.toHaveProperty("date");
});
test("sharing without consent or from another account never reaches the server", async () => {
  const { contributionWorkout } = require("./contribution-fixture");
  await expect(
    contributeRoute(
      "owner",
      contributionWorkout,
      "Name",
      "Place",
      false,
      new AbortController().signal,
    ),
  ).rejects.toThrow("ROUTE_CONSENT_REQUIRED");
  await expect(
    contributeRoute(
      "owner",
      { ...contributionWorkout, ownerId: "other" },
      "Name",
      "Place",
      true,
      new AbortController().signal,
    ),
  ).rejects.toThrow("ROUTE_INVALID");
  expect(calls).toHaveLength(0);
});
