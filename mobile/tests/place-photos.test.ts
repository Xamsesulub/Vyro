jest.mock("../src/lib/supabase", () => ({
  supabase: { storage: { from: jest.fn() }, rpc: jest.fn() },
}));
jest.mock("../src/stores/useAuthStore", () => ({
  useAuthStore: { getState: jest.fn() },
}));
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/useAuthStore";
import { publishPlace } from "../src/features/places/api";
import {
  stripPhotoMetadata,
  validatePlace,
  PHOTO_LIMIT,
} from "../src/features/places/model";
const clean = new Uint8Array([
  255, 216, 255, 224, 0, 4, 65, 66, 255, 218, 0, 2, 1, 2, 3, 255, 217,
]);
test("removes EXIF/XMP, IPTC and comments while preserving encoded pixels and color/header data", () => {
  const metadata = [
    255, 225, 0, 6, 71, 80, 83, 33, 255, 237, 0, 4, 88, 89, 255, 254, 0, 3, 90,
  ];
  const input = new Uint8Array([
    ...clean.slice(0, 2),
    ...metadata,
    ...clean.slice(2),
  ]);
  expect(stripPhotoMetadata(input)).toEqual(clean);
  expect(input.length).toBeGreaterThan(clean.length);
});
test("rejects damaged, oversized or unsupported uploads and empty captions", () => {
  for (const bytes of [
    new Uint8Array(),
    new Uint8Array([255, 216, 255, 225, 0, 99]),
    new Uint8Array(PHOTO_LIMIT + 1),
  ])
    expect(() => stripPhotoMetadata(bytes)).toThrow();
  expect(() => validatePlace(" ", "Oslo")).toThrow();
  expect(() => validatePlace("x".repeat(1001), "Oslo")).toThrow();
  expect(() => validatePlace("Tur", "x".repeat(101))).toThrow();
  expect(() => validatePlace("Tur ved sjøen", "Oslo")).not.toThrow();
});
const upload = jest.fn();
const state = useAuthStore.getState as jest.Mock;
const rpc = supabase!.rpc as jest.Mock;
const photo = {
  id: "draft-id",
  bytes: clean,
  preview: "data:image/jpeg;base64,AA==",
};
beforeEach(() => {
  jest.clearAllMocks();
  state.mockReturnValue({ session: { user: { id: "owner" } } });
  (supabase!.storage.from as jest.Mock).mockReturnValue({ upload });
  upload.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: "draft-id", error: null });
});
test("uploads to the current owner only, with no overwrite, before publishing", async () => {
  await expect(
    publishPlace("owner", photo, " Tur ", " Oslo ", "followers"),
  ).resolves.toBe("draft-id");
  expect(upload).toHaveBeenCalledWith(
    "owner/draft-id.jpg",
    clean.buffer,
    expect.objectContaining({ upsert: false, contentType: "image/jpeg" }),
  );
  expect(rpc).toHaveBeenCalledWith(
    "publish_place",
    expect.objectContaining({ p_caption: "Tur", p_audience: "followers" }),
  );
});
test("a retry reuses its ID, but unrelated upload errors never publish", async () => {
  upload.mockResolvedValueOnce({ error: { statusCode: "409" } });
  await publishPlace("owner", photo, "Tur", "", "followers");
  expect(rpc).toHaveBeenCalledTimes(1);
  rpc.mockClear();
  upload.mockResolvedValueOnce({ error: { statusCode: "403" } });
  await expect(
    publishPlace("owner", photo, "Tur", "", "followers"),
  ).rejects.toEqual({ statusCode: "403" });
  expect(rpc).not.toHaveBeenCalled();
});
test("changing account while uploading cancels publication", async () => {
  upload.mockImplementationOnce(async () => {
    state.mockReturnValue({ session: { user: { id: "other" } } });
    return { error: null };
  });
  await expect(
    publishPlace("owner", photo, "Tur", "", "followers"),
  ).rejects.toThrow("Kontoen er endret");
  expect(rpc).not.toHaveBeenCalled();
});
