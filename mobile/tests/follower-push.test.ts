import {
  dispatchJobs,
  type Job,
} from "../../supabase/functions/follower-notifications/worker";
const job: Job = {
  id: "job",
  lease: "lease",
  token: "ExpoPushToken[local_test]",
  recipient_id: "owner",
  kind: "follow",
  ticket: null,
  attempts: 1,
};
const result = (data: unknown) =>
  ({ ok: true, json: async () => ({ data }) }) as Response;
test("push is generic and contains no route or private actor information", async () => {
  const send = jest
    .fn()
    .mockResolvedValue(result([{ status: "ok", id: "ticket" }]));
  const finish = jest.fn();
  await dispatchJobs([job], finish, send);
  const body = JSON.parse(send.mock.calls[0][1].body);
  expect(body[0]).toEqual({
    to: job.token,
    title: "VYRO",
    body: "Du har en ny følger.",
    sound: "default",
    channelId: "social",
    ttl: 3600,
    data: { screen: "notifications", recipientId: "owner" },
  });
  expect(finish).toHaveBeenCalledWith(job, "ticket", "ticket");
});
test("accepted tickets are checked, never sent again", async () => {
  const j = { ...job, ticket: "existing" };
  const send = jest
    .fn()
    .mockResolvedValue(result({ existing: { status: "ok" } }));
  const finish = jest.fn();
  await dispatchJobs([j], finish, send);
  expect(send.mock.calls[0][0]).toContain("getReceipts");
  expect(finish).toHaveBeenCalledWith(j, "delivered", undefined);
});

test.each(["comment", "like", "post"] as const)(
  "%s notifications carry only a recipient-bound notice ID",
  async (kind) => {
    const send = jest
      .fn()
      .mockResolvedValue(result([{ status: "ok", id: "ticket" }]));
    await dispatchJobs(
      [{ ...job, kind, notice_id: "notice" }],
      jest.fn(),
      send,
    );
    const message = JSON.parse(send.mock.calls[0][1].body)[0];
    expect(message.body).toEqual(expect.any(String));
    expect(message.body.length).toBeGreaterThan(10);
    expect(message.data).toEqual({
      screen: "notifications",
      recipientId: "owner",
      notificationId: "notice",
    });
    expect(message.data).not.toHaveProperty("postId");
    expect(message).not.toHaveProperty("comment");
  },
);
test.each([
  "DeviceNotRegistered",
  "InvalidCredentials",
  "MessageTooBig",
  "MessageRateExceeded",
])("handles %s", async (code) => {
  const send = jest
    .fn()
    .mockResolvedValue(result([{ status: "error", details: { error: code } }]));
  const finish = jest.fn();
  await dispatchJobs([job], finish, send);
  expect(finish).toHaveBeenCalledWith(
    job,
    code === "DeviceNotRegistered"
      ? "unregistered"
      : code === "MessageRateExceeded"
        ? "retry"
        : "failed",
    undefined,
    code,
  );
});
test("network failure is retried without swallowing persistence failure", async () => {
  const send = jest.fn().mockRejectedValue(new Error("offline"));
  const finish = jest.fn();
  await dispatchJobs([job], finish, send);
  expect(finish).toHaveBeenCalledWith(job, "retry", undefined, "transport");
  await expect(
    dispatchJobs(
      [job],
      jest.fn().mockRejectedValue(new Error("database")),
      send,
    ),
  ).rejects.toThrow("database");
});
test("missing receipt is retried", async () => {
  const j = { ...job, ticket: "pending" };
  const finish = jest.fn();
  await dispatchJobs([j], finish, jest.fn().mockResolvedValue(result({})));
  expect(finish).toHaveBeenCalledWith(j, "retry", undefined, "receipt_pending");
});
