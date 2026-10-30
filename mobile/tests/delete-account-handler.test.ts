import {
  deleteAccount,
  type DeletionServices,
} from "../../supabase/functions/delete-account/handler";

const owner = "11111111-1111-4111-8111-111111111111";
const session = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const token = `header.${Buffer.from(JSON.stringify({ sub: "untrusted", session_id: session })).toString("base64url")}.signature`;
const request = (body: unknown = { confirmation: "SLETT" }, bearer = token) =>
  new Request("https://example.test/delete-account", {
    method: "POST",
    headers: { authorization: `Bearer ${bearer}` },
    body: JSON.stringify(body),
  });
function services() {
  return {
    user: jest.fn().mockResolvedValue({ data: { id: owner }, error: null }),
    begin: jest.fn().mockResolvedValue({ error: null }),
    files: jest.fn().mockResolvedValue({ data: [], error: null }),
    remove: jest.fn().mockResolvedValue({ error: null }),
    deleteUser: jest.fn().mockResolvedValue({ error: null }),
  } satisfies DeletionServices;
}
test("requires verified user, exact confirmation, and recent server-side session", async () => {
  const s = services();
  expect(
    (
      await deleteAccount(
        request({ confirmation: "SLETT", owner_id: "victim" }),
        s,
      )
    ).status,
  ).toBe(400);
  expect((await deleteAccount(request(null), s)).status).toBe(400);
  expect(s.user).not.toHaveBeenCalled();
  s.user.mockResolvedValueOnce({
    data: null,
    error: new Error("invalid signature"),
  });
  expect((await deleteAccount(request(), s)).status).toBe(401);
  expect(s.begin).not.toHaveBeenCalled();
  s.begin.mockResolvedValueOnce({ error: new Error("old session") });
  expect((await deleteAccount(request(), s)).status).toBe(403);
  expect(s.begin).toHaveBeenCalledWith(owner, session);
  expect(s.files).not.toHaveBeenCalled();
  expect(s.deleteUser).not.toHaveBeenCalled();
});
test("only verified owner's files removed, paginated cleanup before deleting auth", async () => {
  const s = services(),
    calls: string[] = [];
  s.files.mockResolvedValueOnce({
    data: [{ id: "photo", name: "photo.jpg" }],
    error: null,
  });
  s.remove.mockImplementation(async () => {
    calls.push("files");
    return { error: null };
  });
  s.deleteUser.mockImplementation(async () => {
    calls.push("auth");
    return { error: null };
  });
  expect((await deleteAccount(request(), s)).status).toBe(200);
  expect(s.remove).toHaveBeenCalledWith("profile-photos", [
    `${owner}/photo.jpg`,
  ]);
  expect(s.files.mock.calls).toEqual([
    ["profile-photos", owner],
    ["profile-photos", owner],
    ["place-photos", owner],
  ]);
  expect(s.deleteUser).toHaveBeenCalledWith(owner);
  expect(calls).toEqual(["files", "auth"]);
});
test.each(["../victim.jpg", "folder/photo.jpg", "\\victim.jpg"])(
  "rejects unexpected storage path %s",
  async (name) => {
    const s = services();
    s.files.mockResolvedValueOnce({
      data: [{ id: "file", name }],
      error: null,
    });
    expect((await deleteAccount(request(), s)).status).toBe(503);
    expect(s.remove).not.toHaveBeenCalled();
    expect(s.deleteUser).not.toHaveBeenCalled();
  },
);
test("partial storage failure keeps auth user, next request resumes cleanup", async () => {
  const s = services();
  s.files.mockResolvedValueOnce({
    data: [{ id: "photo", name: "photo.jpg" }],
    error: null,
  });
  s.remove.mockResolvedValueOnce({ error: new Error("offline") });
  expect((await deleteAccount(request(), s)).status).toBe(503);
  expect(s.deleteUser).not.toHaveBeenCalled();
  expect((await deleteAccount(request(), s)).status).toBe(200);
  expect(s.deleteUser).toHaveBeenCalledTimes(1);
});
test("a failed final deletion is retriable and never reported as complete", async () => {
  const s = services();
  s.deleteUser.mockResolvedValueOnce({
    error: new Error("owned file arrived"),
  });
  const response = await deleteAccount(request(), s);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ code: "retry_cleanup" });
});
