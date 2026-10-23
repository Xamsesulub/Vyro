import { mapLoadError } from "../src/features/maps/loadError";

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
