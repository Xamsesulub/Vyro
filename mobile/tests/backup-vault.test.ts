import type { Session } from "@supabase/supabase-js";
import { useAuthStore } from "../src/stores/useAuthStore";
import {
  remoteVault,
  unlockVault,
  vaultKey,
} from "../src/features/backup/vault";
const mockFrom = jest.fn(),
  mockGet = jest.fn(),
  mockSet = jest.fn(),
  mockOpen = jest.fn();
jest.mock("../src/features/social/api", () => ({
  client: () => ({ from: mockFrom }),
}));
jest.mock("../src/features/social/profiles", () => ({
  requireOwner: (owner: string) => {
    if (
      require("../src/stores/useAuthStore").useAuthStore.getState().session
        ?.user.id !== owner
    )
      throw new Error("account changed");
  },
}));
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: {
    getItem: (...a: unknown[]) => mockGet(...a),
    setItem: (...a: unknown[]) => mockSet(...a),
  },
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "new-key" }));
jest.mock("../src/features/backup/cipher", () => ({
  normalizeRecoveryCode: (s: string) => s,
  sealBackup: async () => "opaque-verifier",
  openBackup: (...a: unknown[]) => mockOpen(...a),
}));
function read(value: unknown) {
  const b = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(value),
  };
  b.select.mockReturnValue(b);
  b.eq.mockReturnValue(b);
  mockFrom.mockReturnValueOnce(b);
  return b;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockReset();
  mockOpen.mockReset().mockResolvedValue("VYRO encrypted backup v1");
  mockGet.mockReset();
  mockSet.mockReset().mockResolvedValue(undefined);
  useAuthStore.setState({
    session: { user: { id: "a" } } as Session,
    ready: true,
  });
});
test("new setup writes only an opaque verifier, verifies read-back before storing the key", async () => {
  read({ data: null, error: null });
  const upsert = jest.fn().mockResolvedValue({ error: null });
  mockFrom.mockReturnValueOnce({ upsert });
  read({
    data: { key_id: "new-key", verifier: "opaque-verifier" },
    error: null,
  });
  expect(await unlockVault("a", "private-key")).toEqual({
    keyId: "new-key",
    code: "private-key",
  });
  expect(upsert).toHaveBeenCalledWith(
    { owner_id: "a", key_id: "new-key", verifier: "opaque-verifier" },
    { onConflict: "owner_id", ignoreDuplicates: true },
  );
  expect(JSON.stringify(upsert.mock.calls)).not.toContain("private-key");
  expect(mockOpen.mock.invocationCallOrder[0]).toBeLessThan(
    mockSet.mock.invocationCallOrder[0],
  );
  expect(mockSet).toHaveBeenCalledWith(
    "vyro-backup-key-a",
    JSON.stringify({ keyId: "new-key", code: "private-key" }),
  );
});
test("wrong recovery code never replaces a local key or a cloud vault", async () => {
  read({ data: { key_id: "existing", verifier: "sealed" }, error: null });
  mockOpen.mockRejectedValueOnce(new Error("auth tag"));
  await expect(unlockVault("a", "wrong-key")).rejects.toThrow(
    "Koden passer ikke",
  );
  expect(mockFrom).toHaveBeenCalledTimes(1);
  expect(mockSet).not.toHaveBeenCalled();
});
test("concurrent setup on a second phone cannot overwrite the first vault", async () => {
  read({ data: null, error: null });
  mockFrom.mockReturnValueOnce({
    upsert: jest.fn().mockResolvedValue({ error: null }),
  });
  read({
    data: { key_id: "other-device", verifier: "different" },
    error: null,
  });
  mockOpen.mockRejectedValueOnce(new Error("auth tag"));
  await expect(unlockVault("a", "wrong-key")).rejects.toThrow(
    "Koden passer ikke",
  );
  expect(mockSet).not.toHaveBeenCalled();
});
test("account change during verification cannot save or expose a private key", async () => {
  read({ data: { key_id: "existing", verifier: "sealed" }, error: null });
  mockOpen.mockImplementationOnce(async () => {
    useAuthStore.setState({ session: { user: { id: "b" } } as Session });
    return "VYRO encrypted backup v1";
  });
  await expect(unlockVault("a", "key")).rejects.toThrow("account changed");
  expect(mockSet).not.toHaveBeenCalled();
  await expect(remoteVault("a")).rejects.toThrow("account changed");
});
test("existing local key still has to authenticate the server verifier", async () => {
  read({ data: { key_id: "existing", verifier: "sealed" }, error: null });
  mockGet.mockResolvedValueOnce(
    JSON.stringify({ keyId: "existing", code: "key" }),
  );
  expect(await vaultKey("a")).toEqual({ keyId: "existing", code: "key" });
  expect(mockOpen).toHaveBeenCalledWith(
    "sealed",
    "key",
    "a",
    "vault",
    "existing",
  );
});
