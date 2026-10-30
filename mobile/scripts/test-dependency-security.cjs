/* global __dirname */
const assert = require("node:assert/strict"),
  path = require("node:path");
const merge = require("deepmerge");
for (const dangerous of ["__proto__", "constructor", "prototype"]) {
  const attacker = Object.create(null);
  attacker[dangerous] = { polluted: true };
  attacker.normal = { safe: true };
  for (const [a, b] of [
    [attacker, {}],
    [{}, attacker],
    [Object.create(null), attacker],
  ]) {
    const result = merge(a, b);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(Object.hasOwn(result, dangerous), false);
    assert.equal(result.polluted, undefined);
    assert.deepEqual(result.normal, { safe: true });
  }
}
const symbol = Symbol("safe");
assert.deepEqual(
  merge(
    { array: [1], nested: { a: 1 } },
    { array: [2], nested: { b: 2 }, [symbol]: 3 },
  ),
  { array: [1, 2], nested: { a: 1, b: 2 }, [symbol]: 3 },
);
assert.equal({}.polluted, undefined);
const cli = path.resolve(
  __dirname,
  "../node_modules/@expo/cli/build/src/start/server",
);
const schemas = require(path.join(cli, "DevToolsPlugin.schema.js"));
assert.ok(
  schemas.PluginSchema.parse({ packageName: "test", packageRoot: "/test" }),
);
assert.throws(() => schemas.PluginSchema.parse({ packageName: "" }));
const { createMCPDevToolsExtensionSchema } = require(
  path.join(cli, "createMCPDevToolsExtensionSchema.js"),
);
const schema = createMCPDevToolsExtensionSchema({
  packageName: "test",
  cliExtensions: {
    commands: [
      {
        name: "check",
        title: "Test",
        parameters: [
          { name: "count", type: "number" },
          { name: "confirm", type: "confirm" },
          { name: "text", type: "text" },
        ],
      },
    ],
  },
});
assert.deepEqual(
  schema.parse({ command: "check", count: 2, confirm: true, text: "safe" }),
  { command: "check", count: 2, confirm: true, text: "safe" },
);
assert.throws(() => schema.parse({ command: "check", count: "bad" }));
assert.throws(() => schema.parse({ command: "check", unknown: 1 }));
const { z } = require("zod");
assert.throws(() => z.number().parse("not a number"));
console.log(
  "Prototype-poisoning regressions and Expo Zod compatibility passed.",
);
