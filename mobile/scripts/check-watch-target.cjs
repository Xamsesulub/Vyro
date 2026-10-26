// Run against generated files, never edit ios/ by hand.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const xcode = require("xcode");
const plist = require("@expo/plist").default;
const appConfig = require("../app.json").expo;
const file = path.resolve(
  process.argv[2] || "ios/VYRO.xcodeproj/project.pbxproj",
);
const ios = path.dirname(path.dirname(file));
const project = xcode.project(file);
project.parseSync();
const objects = project.hash.project.objects;
const clean = (value) => String(value).replace(/^"|"$/g, "");
const targets = Object.entries(objects.PBXNativeTarget).filter(
  ([key]) => !key.endsWith("_comment"),
);
const [watchId, watch] =
  targets.find(([, t]) => clean(t.name) === "VyroWatch") || [];
const [, phone] = targets.find(([, t]) => clean(t.name) === "VYRO") || [];
assert(watch && phone, "Both iPhone and Watch targets must exist");
assert(
  targets.some(([, t]) => clean(t.name) === "ExpoWidgetsTarget"),
  "Existing Live Activity target must remain",
);
const configIds =
  objects.XCConfigurationList[watch.buildConfigurationList].buildConfigurations;
for (const { value } of configIds) {
  const settings = objects.XCBuildConfiguration[value].buildSettings;
  assert.equal(clean(settings.SDKROOT), "watchos");
  assert.equal(clean(settings.WATCHOS_DEPLOYMENT_TARGET), "10.0");
  assert.equal(
    clean(settings.PRODUCT_BUNDLE_IDENTIFIER),
    `${appConfig.ios.bundleIdentifier}.watchkitapp`,
  );
  assert.equal(
    clean(settings.INFOPLIST_KEY_WKCompanionAppBundleIdentifier),
    appConfig.ios.bundleIdentifier,
  );
  assert.equal(
    clean(settings.MARKETING_VERSION),
    appConfig.version,
  );
  const entitlements = plist.parse(
    fs.readFileSync(
      path.resolve(ios, clean(settings.CODE_SIGN_ENTITLEMENTS)),
      "utf8",
    ),
  );
  assert.equal(entitlements["com.apple.developer.healthkit"], true);
  const info = plist.parse(
    fs.readFileSync(path.resolve(ios, clean(settings.INFOPLIST_FILE)), "utf8"),
  );
  assert.equal(info.WKApplication, true);
  assert(info.WKBackgroundModes.includes("workout-processing"));
  for (const key of [
    "NSHealthShareUsageDescription",
    "NSHealthUpdateUsageDescription",
    "NSLocationWhenInUseUsageDescription",
  ])
    assert(info[key]?.length > 20);
}
const sources = watch.buildPhases
  .flatMap(({ value }) => objects.PBXSourcesBuildPhase[value]?.files || [])
  .map(
    ({ value }) =>
      objects.PBXFileReference[objects.PBXBuildFile[value].fileRef],
  )
  .map((ref) => path.basename(clean(ref.path)));
// Xcode 16+ also builds sources directly from synchronized folders.
for (const { value } of watch.fileSystemSynchronizedGroups || []) {
  const group = objects.PBXFileSystemSynchronizedRootGroup[value];
  assert.equal(clean(group.path), "watch");
  const parent = Object.values(objects.PBXGroup).find((g) =>
    g.children?.some((child) => child.value === value),
  );
  const directory = path.resolve(ios, clean(parent.path), clean(group.path));
  const excluded = group.exceptions
    .flatMap(
      ({ value }) =>
        objects.PBXFileSystemSynchronizedBuildFileExceptionSet[value]
          .membershipExceptions,
    )
    .map(clean);
  sources.push(
    ...fs
      .readdirSync(directory)
      .filter((name) => name.endsWith(".swift") && !excluded.includes(name)),
  );
}
for (const file of [
  "VyroWatchApp.swift",
  "WorkoutRecorder.swift",
  "WorkoutFiles.swift",
  "PhoneConnection.swift",
])
  assert(sources.includes(file), `Missing ${file}`);
assert(
  phone.dependencies.some(
    ({ value }) => objects.PBXTargetDependency[value].target === watchId,
  ),
  "iPhone must build the Watch target",
);
const embedded = phone.buildPhases.flatMap(
  ({ value }) => objects.PBXCopyFilesBuildPhase[value]?.files || [],
);
assert(
  embedded.some(
    ({ value }) =>
      objects.PBXBuildFile[value].fileRef === watch.productReference,
  ),
  "Watch app must be embedded",
);
console.log(
  "PASS: Watch target, sources, companion ID, versions, privacy strings, HealthKit, build dependency, embedding and existing Live Activity target. Not Swift compilation/signing.",
);
