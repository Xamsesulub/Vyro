import type { Workout } from "../activities/model";
import { competitionTrace } from "./trace";
import { WORKOUT_SHARING_RADIUS_METERS } from "../social/routePrivacy";
import { previewGrowth, type GrowingTurf } from "./growth";

/** Local feedback before sharing; the server still validates every attempt. */
export function turfPreview(
  workout: Workout,
  turf: GrowingTurf | null = null,
  extend = false,
  now = Date.now(),
) {
  if (workout.source !== "gps" || workout.sport !== "Løping")
    throw new Error("Velg en GPS-økt registrert som løping.");
  if (!workout.turfTrace?.length)
    throw new Error(
      "Denne økten mangler GPS-data for soner. Ta opp en ny løpetur i VYRO.",
    );
  const samples = competitionTrace(workout);
  if (samples.length < 2)
    throw new Error(
      `Ingen sammenhengende løype er igjen når ${WORKOUT_SHARING_RADIUS_METERS} meter rundt start og slutt skjermes. Prøv en lengre tur uten avbrudd.`,
    );
  if (samples.some((p) => p.timestamp < now - 7 * 86400000))
    throw new Error("Økten er eldre enn 7 dager. Velg en nyere løpetur.");
  if (samples.some((p) => p.timestamp > now + 60000))
    throw new Error(
      "GPS-tiden ligger i fremtiden. Kontroller dato og klokkeslett på telefonen.",
    );
  return { samples, value: previewGrowth(samples, turf, extend) };
}
