let engine: Promise<typeof import("mapbox-gl-v3")> | undefined;
export function loadMapEngine() {
  return (engine ??= import("mapbox-gl-v3").catch((error) => {
    engine = undefined;
    throw error;
  }));
}
export function prewarmMap() {
  void loadMapEngine()
    .then(({ default: gl }) => gl.prewarm())
    .catch(() => {
      // Opening the map retries; a preload failure must never block the app.
    });
}
