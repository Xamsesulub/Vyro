import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useProfileStore } from "../src/stores/useProfileStore";
import {
  profileDetails,
  saveProfileDetails,
  validateProfileDetails,
  type ProfileDetails,
} from "../src/features/auth/profileDetails";

jest.mock("../src/lib/supabase", () => ({
  supabase: { from: jest.fn(), auth: { updateUser: jest.fn() } },
}));
const profile = { id: "a", username: "runner", display_name: "Ada" };
const draft: ProfileDetails = {
  displayName: " Ada Ny ",
  lastName: " Hansen ",
  bio: " Turer ",
  city: " Oslo ",
  selectedSports: ["Gange"],
};
const user = (id = "a") => ({ id, user_metadata: {} }) as User;
let q: {
  update: jest.Mock;
  eq: jest.Mock;
  select: jest.Mock;
  single: jest.Mock;
};
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ session: { user: user() } as Session });
  useProfileStore.setState({ profile, loadedAt: 0 });
  q = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { ...profile, display_name: "Ada Ny" },
      error: null,
    }),
  };
  jest.mocked(supabase!.from).mockReturnValue(q as never);
  jest.mocked(supabase!.auth.updateUser).mockResolvedValue({
    data: { user: { ...user(), user_metadata: { bio: "Turer" } } },
    error: null,
  });
});
test("public name alone goes to profiles; optional details go to private auth metadata", async () => {
  await saveProfileDetails("a", draft);
  expect(q.update).toHaveBeenCalledWith({ display_name: "Ada Ny" });
  expect(q.eq).toHaveBeenCalledWith("id", "a");
  expect(supabase!.auth.updateUser).toHaveBeenCalledWith({
    data: {
      display_name: "Ada Ny",
      last_name: "Hansen",
      bio: "Turer",
      city: "Oslo",
      main_sport: "Gange",
      sports: ["Gange"],
    },
  });
  expect(useAuthStore.getState().session?.user.user_metadata.bio).toBe("Turer");
});
test("optional fields can be cleared and an unchanged name avoids a public write", async () => {
  await saveProfileDetails("a", {
    ...draft,
    displayName: "Ada",
    lastName: "",
    bio: " ",
    city: "",
  });
  expect(q.update).not.toHaveBeenCalled();
  expect(supabase!.auth.updateUser).toHaveBeenCalledWith({
    data: expect.objectContaining({ last_name: null, bio: null, city: null }),
  });
});
test.each(["response", "network"])(
  "reports an honest partial save after a %s error and retains the public name",
  async (kind) => {
    if (kind === "network")
      jest
        .mocked(supabase!.auth.updateUser)
        .mockRejectedValueOnce(new Error("offline"));
    else
      jest.mocked(supabase!.auth.updateUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: "offline" },
      } as never);
    await expect(saveProfileDetails("a", draft)).rejects.toThrow(
      "Visningsnavnet er lagret",
    );
    expect(useProfileStore.getState().profile?.display_name).toBe("Ada Ny");
    expect(
      useAuthStore.getState().session?.user.user_metadata.bio,
    ).toBeUndefined();
  },
);
test("invalid or stale-owner drafts do not write, and malformed optional metadata has safe defaults", async () => {
  await expect(saveProfileDetails("b", draft)).rejects.toThrow();
  await expect(
    saveProfileDetails("a", { ...draft, displayName: " " }),
  ).rejects.toThrow();
  expect(
    validateProfileDetails({ ...draft, bio: "a".repeat(281) }),
  ).toBeTruthy();
  expect(q.update).not.toHaveBeenCalled();
  expect(supabase!.auth.updateUser).not.toHaveBeenCalled();
  expect(
    profileDetails(
      {
        ...user(),
        user_metadata: { bio: 123, city: null, main_sport: "invalid" },
      },
      "Ada",
    ),
  ).toEqual({
    displayName: "Ada",
    bio: "",
    city: "",
    lastName: "",
    selectedSports: ["Løping"],
  });
});
test("account switching during metadata save cannot restore the previous account", async () => {
  let resolve!: (value: unknown) => void;
  jest.mocked(supabase!.auth.updateUser).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }) as never,
  );
  const saving = saveProfileDetails("a", { ...draft, displayName: "Ada" });
  useAuthStore.setState({ session: { user: user("b") } as Session });
  resolve({ data: { user: user() }, error: null });
  await expect(saving).rejects.toThrow("Kontoen ble byttet");
  expect(useAuthStore.getState().session?.user.id).toBe("b");
});

test("multiple sports including football round trip in private metadata and old single selections migrate", async () => {
  const chosen: ProfileDetails = {
    ...draft,
    selectedSports: ["Løping", "Fotball"],
  };
  await saveProfileDetails("a", chosen);
  expect(supabase!.auth.updateUser).toHaveBeenCalledWith({
    data: expect.objectContaining({
      sports: ["Løping", "Fotball"],
      main_sport: "Løping",
    }),
  });
  expect(
    profileDetails({
      ...user(),
      user_metadata: { sports: ["Fotball", "bad", "Løping", "Fotball"] },
    }).selectedSports,
  ).toEqual(["Løping", "Fotball"]);
  expect(
    profileDetails({ ...user(), user_metadata: { main_sport: "Fottur" } })
      .selectedSports,
  ).toEqual(["Fottur"]);
  expect(validateProfileDetails({ ...draft, selectedSports: [] })).toBeTruthy();
  expect(
    validateProfileDetails({ ...draft, selectedSports: ["Løping", "Løping"] }),
  ).toBeTruthy();
  expect(
    validateProfileDetails({
      ...draft,
      selectedSports: ["Løping", "Gange", "Sykling", "Fottur", "Fotball"],
    }),
  ).toBeUndefined();
});
