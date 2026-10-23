const { checkMapbox } = require("../scripts/check-mapbox.cjs");

const token = "pk.fixture.not-a-real-key";
function response(
  status: number,
  data: unknown,
  contentType = "application/json",
) {
  const bytes = Buffer.isBuffer(data)
    ? data
    : Buffer.from(JSON.stringify(data));
  return {
    status,
    ok: status === 200,
    headers: new Headers({ "content-type": contentType }),
    arrayBuffer: async () => bytes,
    body: { cancel: jest.fn() },
  };
}

test("style and TileJSON success never hide a rejected actual satellite image", async () => {
  const limited = response(429, { message: `secret request ${token}` });
  limited.headers.set("retry-after", "60");
  limited.headers.set("x-rate-limit-remaining", "0");
  limited.headers.set("x-rate-limit-reset", "1800000000");
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(response(200, { version: 8 }))
    .mockResolvedValueOnce(response(200, { version: 8 }))
    .mockResolvedValueOnce(
      response(200, { tiles: ["https://api.mapbox.com/tile"] }),
    )
    .mockResolvedValueOnce(limited);
  const result = await checkMapbox({
    token,
    fetchImpl,
    origin: "http://localhost:8101/map",
  });
  expect(result.map((r: { ok: boolean }) => r.ok)).toEqual([
    true,
    true,
    true,
    false,
  ]);
  expect(result[3]).toMatchObject({
    resource: "satellite-image",
    status: 429,
    reason: "rate-limited",
    retryAfterSeconds: 60,
    rateLimit: { remaining: 0, resetUnixSeconds: 1800000000 },
  });
  expect(fetchImpl).toHaveBeenCalledTimes(4);
  expect(fetchImpl.mock.calls[3][0]).toContain("/v4/mapbox.satellite/12/");
  expect(fetchImpl.mock.calls[3][1].headers).toEqual({
    Origin: "http://localhost:8101",
    Referer: "http://localhost:8101/",
  });
  expect(JSON.stringify(result)).not.toContain(token);
});

test("denied access stops the diagnostic without retries or following provider URLs", async () => {
  const fetchImpl = jest.fn().mockResolvedValue(response(403, { url: token }));
  const result = await checkMapbox({ token, fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(result[0].reason).toBe("access-denied");
  expect(JSON.stringify(result)).not.toContain(token);
  await checkMapbox({ token: "sk.secret", fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("a 200 response containing JSON instead of image bytes is not reported as working imagery", async () => {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(response(200, { version: 8 }))
    .mockResolvedValueOnce(response(200, { version: 8 }))
    .mockResolvedValueOnce(
      response(200, { tiles: ["https://api.mapbox.com/tile"] }),
    )
    .mockResolvedValueOnce(response(200, { error: "unavailable" }));
  const result = await checkMapbox({ token, fetchImpl });
  expect(result[3]).toMatchObject({ ok: false, reason: "unexpected-content" });
});
