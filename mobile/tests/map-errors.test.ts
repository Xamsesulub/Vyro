import { mapErrorStatus, mapLoadError } from "../src/features/maps/loadError";

test("rate limits and denied access have distinct, actionable messages without leaking provider URLs", () => {
  const privateUrl = "https://provider.example/tile?access_token=secret";
  expect(mapLoadError({ status: 429, message: privateUrl })).toContain(
    "begrenser tilgangen",
  );
  for (const status of [401, 403])
    expect(mapLoadError({ status, message: privateUrl })).toContain(
      "Karttilgangen ble avvist",
    );
  for (const error of [
    null,
    undefined,
    new Error(privateUrl),
    { status: 500, url: privateUrl },
  ]) {
    expect(mapLoadError(error)).toContain("nettforbindelsen");
    expect(mapLoadError(error)).not.toContain("secret");
  }
});

test("native HTTP error payloads get the same classification without exposing their URLs", () => {
  for (const error of [
    {
      error:
        "HTTP status code 429 for https://example.org/?access_token=secret",
    },
    { error: "HTTP response code: 429" },
    { message: "HTTP/2 429 Too Many Requests" },
  ]) {
    expect(mapErrorStatus(error)).toBe(429);
    expect(mapLoadError(error)).toContain("begrenser tilgangen");
    expect(mapLoadError(error)).not.toContain("secret");
  }
  expect(mapErrorStatus({ error: "HTTP status code 403" })).toBe(403);
  expect(
    mapErrorStatus({ message: "https://tiles.example/429/1/2" }),
  ).toBeUndefined();
});
