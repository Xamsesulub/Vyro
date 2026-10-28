// Run after: node node_modules/expo-widgets/scripts/build-bundle.mjs . ios .expo/widgets-runtime.bundle
// Executes the real SDK widget serialization and isolated runtime. No native
// iOS rendering or ActivityKit behavior is implied by this check.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");
const root = path.resolve(__dirname, "..");
const filename = path.join(
  root,
  "src/features/tracking/WorkoutActivity.ios.tsx",
);
const preset = require.resolve("babel-preset-expo", {
  paths: [require.resolve("expo")],
});
const result = babel.transformFileSync(filename, {
  babelrc: false,
  configFile: false,
  presets: [[preset]],
  caller: {
    name: "metro",
    platform: "ios",
    isDev: false,
    supportsStaticESM: false,
  },
});
let layout;
vm.runInNewContext(result.code, {
  exports: {},
  require: (name) =>
    name === "expo-widgets"
      ? {
          createLiveActivity: (name, code) => {
            assert.equal(name, "VyroWorkout");
            layout = code;
            return {};
          },
        }
      : {},
});
assert.equal(
  typeof layout,
  "string",
  "The widget directive must serialize the layout",
);
const context = vm.createContext({ console, setTimeout, clearTimeout });
vm.runInContext(
  fs.readFileSync(path.join(root, ".expo/widgets-runtime.bundle"), "utf8"),
  context,
);
vm.runInContext(`globalThis.__expoWidgetLayout = (${layout})`, context);
const props = {
  sport: "Løping",
  paused: false,
  seconds: "05:00",
  timerStart: 100000,
  distance: "1,00",
  pace: "05:00",
  mapUri: "file:///shared/map.png",
  mapTime: "12:30",
};
for (const variant of [
  "running",
  "paused",
  "stale",
  "dark",
  "dimmed",
  "no-map",
  "timer",
  "cycling",
]) {
  const rendered = context.__expoWidgetRender(
    {
      ...props,
      paused: variant === "paused",
      timerOnly: variant === "timer",
      paceLabel: variant === "cycling" ? "Snitt km/t" : undefined,
      mapUri: ["no-map", "timer"].includes(variant) ? null : props.mapUri,
    },
    {
      colorScheme: variant === "dark" ? "dark" : "light",
      isStale: variant === "stale",
      isLuminanceReduced: variant === "dimmed",
    },
  );
  assert.ok(rendered.banner);
  assert.ok(rendered.compactLeading);
  assert.ok(rendered.compactTrailing);
  const tree = JSON.stringify(rendered);
  assert.equal(
    tree.includes("Snitt /km"),
    !["timer", "cycling"].includes(variant),
  );
  if (variant === "timer") {
    assert.ok(!tree.includes("Distanse"));
    assert.ok(JSON.stringify(rendered.compactTrailing).includes("timer"));
  }
  if (variant === "cycling") assert.ok(tree.includes("Snitt km/t"));
  assert.equal(
    tree.includes("file:///shared/map.png"),
    !["no-map", "timer"].includes(variant),
  );
  if (variant === "paused") assert.ok(tree.includes("Pauset"));
  if (variant === "stale") assert.ok(tree.includes("Åpne økten"));
  assert.ok(!tree.includes("View not found"));
}
console.log(
  "Workout widget: 8 states serialized and rendered in the Expo widget runtime.",
);
