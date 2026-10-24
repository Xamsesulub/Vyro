// Runs before dependency installation on EAS, so use Node built-ins only.
// Environment values are deliberately never logged.
function releaseEnvironmentErrors(env) {
  const errors = [];
  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key =
    env.EXPO_PUBLIC_SUPABASE_KEY ??
    env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";
  const mapbox = env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    errors.push(
      "EXPO_PUBLIC_SUPABASE_URL: set the existing project's HTTPS URL.",
    );
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) {
    errors.push("EXPO_PUBLIC_SUPABASE_KEY: set a public sb_publishable_ key.");
  }
  if (
    env.VYRO_RELEASE_PLATFORM === "web" &&
    !/^pk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(mapbox)
  ) {
    errors.push(
      "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: set a public pk. token for the web preview.",
    );
  }
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("EXPO_PUBLIC_") || !value) continue;
    let serviceRole = false;
    try {
      const payload = value.split(".")[1];
      serviceRole =
        JSON.parse(Buffer.from(payload ?? "", "base64url").toString()).role ===
        "service_role";
    } catch {
      // Most environment values are not JWTs.
    }
    if (/^(sb_secret_|sk\.)/.test(value.trim()) || serviceRole) {
      errors.push(`${name}: backend secrets must never be bundled in the app.`);
    }
  }
  return errors;
}

if (require.main === module) {
  const errors = releaseEnvironmentErrors(process.env);
  if (errors.length) {
    console.error(
      "VYRO release blocked: configure the EAS production environment.",
    );
    for (const error of errors) console.error(`- ${error}`);
    console.error(
      "See docs/testflight.md. No environment values were printed.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "Release environment formats accepted. Live login and map access still require verification.",
    );
  }
}

module.exports = { releaseEnvironmentErrors };
