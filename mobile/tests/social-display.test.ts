import { visibleUsername } from "../src/features/social/display";

test("only machine-generated handles are hidden, never chosen runner names", () => {
  expect(visibleUsername("runner_e85ffea8a1e7416c834b2c79e9d65617")).toBeNull();
  expect(visibleUsername("runner_alex")).toBe("@runner_alex");
  expect(visibleUsername("xamse")).toBe("@xamse");
});
