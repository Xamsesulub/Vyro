import type { Session } from "@supabase/supabase-js";
import type { Workout } from "../src/features/activities/model";
import {
  backupPayload,
  mergeBackups,
  sameBackup,
  validBackup,
} from "../src/features/backup/model";
import {
  syncBackup,
  restoreBackup,
  useBackupStatus,
  cancelBackup,
  deleteBackups,
} from "../src/features/backup/sync";
import { useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
const mockRequest = jest.fn();
const mockVault = jest.fn();
jest.mock("../src/features/backup/vault", () => ({
  vaultKey: (...args: unknown[]) => mockVault(...args),
}));
jest.mock("../src/features/backup/cipher", () => ({
  sealBackup: async (text: string) => `sealed:${text}`,
  openBackup: async (text: string) => {
    if (!text.startsWith("sealed:")) throw new Error("Tampered");
    return text.slice(7);
  },
}));
jest.mock("../src/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockRequest(...args) },
}));
const w: Workout = {
  id: "gps-1",
  ownerId: "a",
  source: "gps",
  visibility: "private",
  title: "Tur",
  notes: "Privat notat",
  sport: "Løping",
  distance: 1,
  seconds: 300,
  date: "2026-10-22T10:00:00Z",
  route: [
    { latitude: 59, longitude: 10 },
    { latitude: 59.01, longitude: 10, breakBefore: true },
  ],
  splits: [{ kilometer: 1, seconds: 300, elapsedSeconds: 300 }],
};
const session = (id: string) => ({ user: { id } }) as Session;
function response(value: unknown) {
  const builder = {
    upsert: jest.fn(),
    select: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    gt: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    in: jest.fn(),
    single: jest.fn(),
    abortSignal: jest.fn(),
    then: undefined as unknown,
  };
  for (const method of [
    "upsert",
    "select",
    "delete",
    "eq",
    "gt",
    "order",
    "limit",
    "in",
  ] as const)
    builder[method].mockReturnValue(builder);
  builder.abortSignal.mockImplementation(() => Promise.resolve(value));
  builder.single.mockImplementation(() => Promise.resolve(value));
  builder.abortSignal.mockReturnValue(builder);
  builder.then = (resolve: (result: unknown) => void) =>
    Promise.resolve(value).then(resolve);
  mockRequest.mockReturnValueOnce(builder);
  return builder;
}
beforeEach(() => {
  mockRequest.mockReset();
  mockVault
    .mockReset()
    .mockResolvedValue({ keyId: "key-1", code: "test-code" });
  useAuthStore.setState({ session: session("a"), ready: true });
  useAppStore.setState({
    ready: true,
    workouts: [],
    backupOwners: ["a"],
    backupReceipts: {},
    hiddenBackups: [],
  });
  useBackupStatus.setState({
    owner: undefined,
    busy: false,
    error: null,
    lastSynced: undefined,
  });
});
afterEach(cancelBackup);
test("JSONB key order does not reject a verified backup, but changed routes do", () => {
  const reordered = {
    ...w,
    route: w.route!.map((p) => Object.fromEntries(Object.entries(p).reverse())),
  } as Workout;
  expect(sameBackup(w, reordered)).toBe(true);
  expect(sameBackup(w, { ...w, route: [...w.route!].reverse() })).toBe(false);
  expect(sameBackup(w, { ...w, notes: "Changed" })).toBe(false);
});
test("portable backup retains full private route and notes but excludes competition proof", () => {
  expect(
    backupPayload({ ...w, turfId: "secret-proof", turfTrace: [] }, "a"),
  ).toEqual(w);
  expect(() => backupPayload({ ...w, source: "simulation" }, "a")).toThrow();
  expect(validBackup({ ...w, ownerId: "b" }, "a", w.id)).toBe(false);
  expect(
    validBackup({ ...w, route: [{ latitude: 999, longitude: 10 }] }, "a", w.id),
  ).toBe(false);
  expect(
    validBackup(
      { ...w, splits: [{ kilometer: 1, seconds: 999, elapsedSeconds: 999 }] },
      "a",
      w.id,
    ),
  ).toBe(false);
});
test("restore deduplicates without overwriting local notes or reviving locally deleted workouts", () => {
  const local = { ...w, notes: "Behold lokalt" };
  expect(mergeBackups([local], [w, w], [])).toEqual([local]);
  expect(mergeBackups([], [w, w], [])).toEqual([w]);
  expect(mergeBackups([], [w], ["a:gps-1"])).toEqual([]);
});
test("no opt-in or wrong account means no requests", async () => {
  useAppStore.setState({ backupOwners: [] });
  await syncBackup("a");
  await syncBackup("b");
  expect(mockRequest).not.toHaveBeenCalled();
});
test("uploads are idempotent, private, acknowledged only on success, and retry after a lost response", async () => {
  useAppStore.setState({
    workouts: [
      w,
      { ...w, id: "sim", source: "simulation" },
      { ...w, id: "other", ownerId: "b" },
    ],
  });
  response({ data: [] });
  response({ error: { code: "network" } });
  await syncBackup("a");
  expect(useAppStore.getState().backupReceipts).toEqual({});
  response({ data: [] });
  const upload = response({ error: null });
  response({
    data: {
      local_id: w.id,
      key_id: "key-1",
      ciphertext: `sealed:${JSON.stringify(w)}`,
    },
  });
  response({ data: [{ local_id: w.id }] });
  await syncBackup("a");
  expect(upload.upsert).toHaveBeenCalledWith(
    {
      owner_id: "a",
      local_id: w.id,
      key_id: "key-1",
      ciphertext: `sealed:${JSON.stringify(backupPayload(w, "a"))}`,
    },
    { onConflict: "owner_id,local_id", ignoreDuplicates: true },
  );
  expect(useAppStore.getState().backupReceipts).toEqual({
    "a:gps-1": "encrypted:key-1",
  });
  expect(useBackupStatus.getState().error).toBeNull();
  response({ data: [] });
  response({ data: [] });
  await syncBackup("a");
  expect(mockRequest).toHaveBeenCalledTimes(8);
});
test("new phone restores private workouts and explicit restore revives locally deleted copies", async () => {
  useAppStore.setState({ hiddenBackups: ["a:gps-1"] });
  response({ data: [] });
  response({ data: [{ local_id: w.id }] });
  await syncBackup("a");
  expect(useAppStore.getState().workouts).toEqual([]);
  response({ data: [] });
  response({ data: [{ local_id: w.id }] });
  response({
    data: [
      {
        local_id: w.id,
        key_id: "key-1",
        ciphertext: `sealed:${JSON.stringify(w)}`,
      },
    ],
  });
  await restoreBackup("a");
  expect(useAppStore.getState().workouts).toEqual([w]);
  expect(useAppStore.getState().backupReceipts["a:gps-1"]).toBe(
    "encrypted:key-1",
  );
});
test("a late response after account change cannot merge private data", async () => {
  let resolve!: (result: unknown) => void;
  const deferred = new Promise((done) => {
    resolve = done;
  });
  const request = response({});
  request.abortSignal.mockReturnValue(deferred);
  const work = syncBackup("a");
  await Promise.resolve();
  useAuthStore.setState({ session: session("b") });
  resolve({ data: [{ local_id: w.id }] });
  await work;
  expect(useAppStore.getState().workouts).toEqual([]);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});
test("deleting backups disables this device and retains local workouts", async () => {
  useAppStore.setState({
    workouts: [w],
    backupReceipts: { "a:gps-1": "saved", "b:gps-2": "saved" },
  });
  const deletion = response({ error: null });
  response({ error: null });
  await deleteBackups("a");
  expect(deletion.delete).toHaveBeenCalled();
  expect(useAppStore.getState().workouts).toEqual([w]);
  expect(useAppStore.getState().backupOwners).toEqual([]);
  expect(useAppStore.getState().backupReceipts).toEqual({ "b:gps-2": "saved" });
});

test("opting out aborts the merge even when a server response arrives late", async () => {
  let resolve!: (result: unknown) => void;
  const request = response({});
  request.abortSignal.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const work = syncBackup("a");
  await Promise.resolve();
  useAppStore.setState({ backupOwners: [] });
  cancelBackup();
  resolve({ data: [{ local_id: w.id }] });
  await work;
  expect(useAppStore.getState().workouts).toEqual([]);
  expect(useBackupStatus.getState().busy).toBe(false);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test("no recovery key prevents any plaintext upload", async () => {
  mockVault.mockRejectedValueOnce(new Error("Recovery code required"));
  useAppStore.setState({ workouts: [w] });
  await syncBackup("a");
  expect(mockRequest).not.toHaveBeenCalled();
  expect(useBackupStatus.getState().error).toContain("Recovery");
});
test("legacy data is deleted only after verified encrypted read-back", async () => {
  response({ data: [{ local_id: w.id, payload: w }] });
  const upload = response({ error: null });
  response({
    data: {
      local_id: w.id,
      key_id: "key-1",
      ciphertext: `sealed:${JSON.stringify(w)}`,
    },
  });
  const removal = response({ error: null });
  response({ data: [] });
  await syncBackup("a");
  expect(upload.upsert).toHaveBeenCalled();
  expect(removal.delete).toHaveBeenCalled();
  expect(useBackupStatus.getState().error).toBeNull();
});
test("tampered verification never deletes legacy data or acknowledges a backup", async () => {
  response({ data: [{ local_id: w.id, payload: w }] });
  response({ error: null });
  response({
    data: { local_id: w.id, key_id: "key-1", ciphertext: "tampered" },
  });
  await syncBackup("a");
  expect(mockRequest).toHaveBeenCalledTimes(3);
  expect(useAppStore.getState().backupReceipts).toEqual({});
  expect(useBackupStatus.getState().error).toBeTruthy();
});
