import type { Workout } from "./model";

const xml = (value: string) =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

/** Export only the owner's actual route. Never invent timestamps or bridge pauses. */
export function workoutGpx(workout: Workout, userId: string | undefined) {
  if (!userId || workout.ownerId !== userId || workout.source !== "gps")
    throw new Error("Bare dine egne GPS-økter kan eksporteres.");
  const route = workout.route;
  if (
    !route ||
    route.length < 2 ||
    route.some(
      (point) =>
        !Number.isFinite(point.latitude) ||
        Math.abs(point.latitude) > 90 ||
        !Number.isFinite(point.longitude) ||
        Math.abs(point.longitude) > 180,
    )
  )
    throw new Error("Økten mangler en gyldig GPS-rute.");
  const segments: string[][] = [[]];
  for (const point of route) {
    if (point.breakBefore && segments[segments.length - 1].length)
      segments.push([]);
    segments[segments.length - 1].push(
      `      <trkpt lat="${point.latitude}" lon="${point.longitude}" />`,
    );
  }
  return {
    filename: `vyro-${workout.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "rute"}.gpx`,
    contents: `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VYRO" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${xml(workout.title)}</name>
    <type>${xml(workout.sport)}</type>
${segments.map((points) => `    <trkseg>\n${points.join("\n")}\n    </trkseg>`).join("\n")}
  </trk>
</gpx>
`,
  };
}
