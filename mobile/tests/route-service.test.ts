import { retiredRouteHandler } from "../../supabase/functions/route-suggestions/handler";
test("old installations cannot trigger external routing or receive generated suggestions", async () => {
  const fetcher = jest.spyOn(global, "fetch");
  const result = retiredRouteHandler(
    new Request("https://fixture/routes", { method: "POST", body: "{}" }),
  );
  expect(result.status).toBe(410);
  expect(await result.json()).toMatchObject({ code: "ROUTES_UPDATED" });
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockRestore();
});
test("preflight is supported for previous web installations", () => {
  expect(
    retiredRouteHandler(
      new Request("https://fixture/routes", { method: "OPTIONS" }),
    ).status,
  ).toBe(204);
});
