jest.mock("../src/lib/supabase", () => ({ supabase: { rpc: jest.fn() } }));
import { supabase } from "../src/lib/supabase";
import {
  createClub,
  joinClub,
  loadClubPage,
  Club,
} from "../src/features/clubs/api";
const rpc = supabase!.rpc as jest.Mock;
beforeEach(() => jest.clearAllMocks());

test("new clubs stay private unless the owner selects open", async () => {
  rpc.mockResolvedValue({ data: "club", error: null });
  await createClub("  Kveldstur  ", "  Tur i marka  ");
  expect(rpc).toHaveBeenLastCalledWith("create_club", {
    p_name: "Kveldstur",
    p_description: "Tur i marka",
    p_visibility: "private",
  });
  await createClub("Kveldstur", "", "open");
  expect(rpc.mock.calls.at(-1)[1].p_visibility).toBe("open");
});
test("invalid club input never calls the database", async () => {
  await expect(createClub(" ", "")).rejects.toThrow();
  await expect(createClub("Klubb", "a".repeat(501))).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
});
test("discovery pages use a stable cursor and preserve database ordering", async () => {
  const clubs = Array.from(
    { length: 21 },
    (_, i) => ({ id: `${i}`, created_at: "2026-10-23T10:00:00Z" }) as Club,
  );
  rpc.mockReturnValue({
    abortSignal: jest.fn().mockResolvedValue({ data: clubs, error: null }),
  });
  const page = await loadClubPage(
    "discover",
    clubs[0],
    new AbortController().signal,
  );
  expect(page.items).toEqual(clubs.slice(0, 20));
  expect(page.more).toBe(true);
  expect(rpc).toHaveBeenCalledWith("vyro_clubs", {
    p_kind: "discover",
    p_limit: 21,
    p_before_created_at: clubs[0].created_at,
    p_before_id: "0",
  });
});
test("a refused join is reported, never treated as local membership", async () => {
  const error = { code: "42501", message: "Club is not open" };
  rpc.mockResolvedValue({ error });
  await expect(joinClub("private-club")).rejects.toEqual(error);
  expect(rpc).toHaveBeenCalledWith("join_open_club", {
    p_club: "private-club",
  });
});
