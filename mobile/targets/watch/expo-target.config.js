/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "watch",
  name: "VyroWatch",
  displayName: "VYRO",
  bundleIdentifier: ".watchkitapp",
  deploymentTarget: "10.0",
  icon: "../../assets/icon.png",
  colors: { $accent: "#B2FF78" },
  frameworks: ["SwiftUI", "HealthKit", "CoreLocation", "WatchConnectivity"],
  entitlements: { "com.apple.developer.healthkit": true },
};
