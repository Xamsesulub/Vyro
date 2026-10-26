import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as social from "../src/features/social/api";
import {
  loadTurf,
  loadTurfs,
  submitTurf,
  turfError,
  type TurfSummary,
} from "../src/features/turf/api";
import { turfPreview } from "../src/features/turf/eligibility";
import { metersBetween } from "../src/features/tracking/gps";
import { turfWorkout, turfResult } from "./turf-fixtures";
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
let requests: { url: URL; body: Record<string, unknown> | null }[];
let respond: (url: URL) => unknown;
beforeEach(() => {
  requests = [];
  respond = () => [];
  const db = createClient("https://fixture.supabase.co", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (async (input, init) => {
        const url = new URL(String(input));
        requests.push({
          url,
          body: init?.body ? JSON.parse(String(init.body)) : null,
        });
        return new Response(JSON.stringify(respond(url)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch,
    },
  });
  jest.spyOn(social, "client").mockReturnValue(db);
});
afterEach(() => jest.restoreAllMocks());
const zone = (
  id: string,
  updated_at = "2026-10-01T00:00:00+00:00",
): TurfSummary => ({
  id,
  name: id,
  updated_at,
  owner_id: "owner",
  revision: 1,
  distance_m: 800,
  seconds: 200,
});

test("personal and followed zones are filtered on the server, without downloading route geometry", async () => {
  respond = (u) =>
    u.searchParams.has("owner_id")
      ? [zone("old-own")]
      : u.searchParams.has("turf_events.actor_id")
        ? [zone("created-then-lost")]
        : [zone("old-friend")];
  const page = await loadTurfs("owner", "circle");
  expect(page.items.map((t) => t.id)).toEqual([
    "created-then-lost",
    "old-friend",
    "old-own",
  ]);
  expect(requests).toHaveLength(3);
  for (const { url } of requests) {
    expect(url.searchParams.get("select")).not.toContain("route");
    expect(url.searchParams.get("limit")).toBe("21");
  }
  expect(requests[1].url.searchParams.get("turf_events.revision")).toBe("eq.1");
  expect(requests[2].url.searchParams.get("select")).toContain(
    "follows!follows_following_id_fkey!inner",
  );
  expect(requests[2].url.searchParams.get("profiles.follows.follower_id")).toBe(
    "eq.owner",
  );
});
test("paging merges overlapping sources once, orders ties by id and applies the cursor to every query", async () => {
  const rows = Array.from({ length: 21 }, (_, i) =>
    zone(String(i).padStart(2, "0")),
  );
  respond = () => rows;
  const first = await loadTurfs("owner", "mine");
  expect(first.items).toHaveLength(20);
  expect(first.next?.id).toBe("19");
  requests = [];
  respond = () => [rows[20]];
  const second = await loadTurfs("owner", "mine", first.next);
  expect(second.items.map((t) => t.id)).toEqual(["20"]);
  expect(second.next).toBeNull();
  expect(
    requests.every(({ url }) =>
      url.searchParams.get("or")?.includes("id.gt.19"),
    ),
  ).toBe(true);
});
test("all zones need one paged request and deep links load their exact id", async () => {
  await loadTurfs("owner", "all");
  expect(requests).toHaveLength(1);
  respond = () => [{ ...zone("very-old"), route: [] }];
  expect((await loadTurf("very-old")).id).toBe("very-old");
  expect(requests[1].url.searchParams.get("id")).toBe("eq.very-old");
  respond = () => [];
  await expect(loadTurf("deleted")).rejects.toThrow("finnes ikke");
});
test("publishing only uploads the reviewed interior and records the server's result", async () => {
  respond = (u) => (u.pathname.endsWith("submit_turf_run") ? turfResult : []);
  const w = turfWorkout();
  await expect(
    submitTurf(w, "owner", null, false, " Ny sone "),
  ).resolves.toEqual({ result: turfResult, existing: false });
  const body = requests.find(({ url }) =>
    url.pathname.endsWith("submit_turf_run"),
  )!.body!;
  expect(body.p_name).toBe("Ny sone");
  const points = body.p_samples as NonNullable<typeof w.turfTrace>;
  expect(points.length).toBeLessThan(w.turfTrace!.length);
  expect(
    points.every(
      (p) =>
        metersBetween(p, w.turfTrace![0]) > 500 &&
        metersBetween(p, w.turfTrace!.at(-1)!) > 500,
    ),
  ).toBe(true);
  expect(Object.keys(points[0]).sort()).toEqual([
    "accuracy",
    "latitude",
    "longitude",
    "timestamp",
  ]);
});
test("a lost publication response is recovered without submitting a new zone, even for an expired workout", async () => {
  respond = () => [{ result: turfResult }];
  const w = turfWorkout({ turfTrace: [] });
  await expect(submitTurf(w, "owner", null, false, "Retry")).resolves.toEqual({
    result: turfResult,
    existing: true,
  });
  expect(requests).toHaveLength(1);
  expect(requests[0].url.searchParams.get("actor_id")).toBe("eq.owner");
  expect(requests[0].url.searchParams.get("local_id")).toBe("eq.gps-zone");
});
test("invalid GPS, foreign accounts and simulations never reach the publish RPC", async () => {
  await expect(
    submitTurf(turfWorkout({ ownerId: "other" }), "owner", null, false, "x"),
  ).rejects.toThrow("egen");
  await expect(
    submitTurf(
      turfWorkout({ source: "simulation" }),
      "owner",
      null,
      false,
      "x",
    ),
  ).rejects.toThrow("GPS");
  await expect(
    submitTurf(turfWorkout({ turfTrace: [] }), "owner", null, false, "x"),
  ).rejects.toThrow("mangler GPS-data");
  expect(requests.some(({ url }) => url.pathname.includes("/rpc/"))).toBe(
    false,
  );
});
test("eligibility explains short, old, future, missing and interrupted recordings before sending", () => {
  const w = turfWorkout();
  expect(() =>
    turfPreview({ ...w, turfTrace: w.turfTrace!.slice(0, 20) }),
  ).toThrow("500 meter");
  expect(() => turfPreview({ ...w, turfTrace: [] })).toThrow(
    "mangler GPS-data",
  );
  expect(() =>
    turfPreview({
      ...w,
      turfTrace: w.turfTrace!.map((p) => ({
        ...p,
        timestamp: p.timestamp - 8 * 86400000,
      })),
    }),
  ).toThrow("eldre enn 7 dager");
  expect(() =>
    turfPreview({
      ...w,
      turfTrace: w.turfTrace!.map((p) => ({
        ...p,
        timestamp: p.timestamp + 86400000,
      })),
    }),
  ).toThrow("fremtiden");
  expect(() =>
    turfPreview({
      ...w,
      turfTrace: w.turfTrace!.map((p, i) =>
        i === 50 ? { ...p, timestamp: p.timestamp + 30000 } : p,
      ),
    }),
  ).toThrow("hull");
  expect(turfError({ message: "TURF_GPS_GAP", code: "P0001" })).toContain(
    "avbrudd",
  );
  expect(turfError({ message: "TURF_WRONG_ROUTE", code: "P0001" })).toContain(
    "riktig retning",
  );
});
test("microsecond cursors preserve PostgreSQL order across overlapping sources", async () => {
  respond = (u) =>
    u.searchParams.has("owner_id")
      ? [zone("a-older", "2026-10-01T00:00:00.123Z")]
      : [zone("z-newer", "2026-10-01T00:00:00.123001Z")];
  expect((await loadTurfs("owner", "mine")).items.map((t) => t.id)).toEqual([
    "z-newer",
    "a-older",
  ]);
});
test("leaving or switching accounts during receipt lookup prevents a later write", async () => {
  const controller = new AbortController();
  respond = () => {
    controller.abort();
    return [];
  };
  await expect(
    submitTurf(turfWorkout(), "owner", null, false, "Sone", controller.signal),
  ).rejects.toThrow("VYRO_REQUEST_CANCELLED");
  expect(requests.some(({ url }) => url.pathname.includes("/rpc/"))).toBe(
    false,
  );
});
