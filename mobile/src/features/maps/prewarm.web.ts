let engine: Promise<typeof import("mapbox-gl-v3")> | undefined;
export function loadMapEngine() {
  return (engine ??= import("mapbox-gl-v3")
    .then((module) => {
      // Keep workers alive across map screens instead of paying startup again.
      module.default.prewarm();
      return module;
    })
    .catch((error) => {
      engine = undefined;
      throw error;
    }));
}
export function prewarmMap() {
  void loadMapEngine().catch(() => {
    // Opening the map retries; a preload failure must never block the app.
  });
}
