import { MapPoint } from "../maps/config";
import { Sample, meters } from "./rules";
import { traceDistance } from "./trace";

export type GrowingTurf = {
  id: string;
  name: string;
  owner_id: string;
  revision: number;
  route: MapPoint[];
  distance_m: number;
  seconds: number;
  club_id?: string | null;
  profiles?: { display_name: string; avatar_path?: string | null };
};
export type GrowthPreview = {
  route: MapPoint[];
  seconds: number;
  originalSeconds: number;
  distance: number;
  wins: boolean;
};
// UX preview only. PostgreSQL repeats validation and locks the current revision.
export function previewGrowth(
  samples: Sample[],
  turf: GrowingTurf | null,
  extend: boolean,
): GrowthPreview {
  if (samples.length < 2)
    throw new Error(
      "Ingen sammenhengende løype utenfor de private start- og sluttområdene.",
    );
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    if (
      ![p.latitude, p.longitude, p.timestamp, p.accuracy].every(
        Number.isFinite,
      ) ||
      Math.abs(p.latitude) > 90 ||
      Math.abs(p.longitude) > 180 ||
      p.accuracy < 0 ||
      p.accuracy > 30
    )
      throw new Error("GPS-opptaket er for upresist.");
    if (i > 0) {
      const d = meters(samples[i - 1], p);
      const dt = (p.timestamp - samples[i - 1].timestamp) / 1000;
      if (dt <= 0 || dt > 3600 || d > 40 || d / dt > 12 || (dt > 15 && d > 10))
        throw new Error(
          "GPS-sporet har et hull eller urealistisk fart. Det kan ikke brukes i konkurransen.",
        );
    }
  }
  const distance = traceDistance(samples);
  if (distance < 200 || distance > 100000)
    throw new Error("Den synlige løypa må være mellom 200 meter og 100 km.");
  let start = 0,
    end = samples.length - 1;
  if (turf) {
    start = samples.findIndex((p) => meters(p, turf.route[0]) <= 15);
    if (start < 0)
      throw new Error("Økten passerer ikke starten på denne sonen.");
    let j = 0;
    end = -1;
    for (let i = start; i < samples.length; i++) {
      while (
        j < turf.route.length - 1 &&
        meters(samples[i], turf.route[j + 1]) <= 25
      )
        j++;
      if (meters(samples[i], turf.route[j]) > 35)
        throw new Error("Du må følge hele løypa i samme retning.");
      if (
        j === turf.route.length - 1 &&
        meters(samples[i], turf.route[j]) <= 15
      ) {
        end = i;
        break;
      }
    }
    if (end < 0)
      throw new Error("Økten fullfører ikke hele den gjeldende sonen.");
    const matched = traceDistance(samples.slice(start, end + 1));
    if (matched < turf.distance_m * 0.95 || matched > turf.distance_m * 1.1)
      throw new Error("Distansen avviker for mye fra konkurranseløypa.");
  }
  const originalSeconds =
    (samples[end].timestamp - samples[start].timestamp) / 1000;
  const wins = !turf || originalSeconds < turf.seconds;
  if (originalSeconds <= 0) throw new Error("Mangler gyldig totaltid.");
  if (extend && (!turf || !wins))
    throw new Error("Slå tiden på den opprinnelige sonen før du utvider den.");
  if (extend && traceDistance(samples.slice(end)) < 100)
    throw new Error(
      "Utvidelsen må være minst 100 meter etter mål, utenfor private områder.",
    );
  const route = turf
    ? [...turf.route, ...(extend ? samples.slice(end + 1) : [])]
    : samples;
  const finalIndex = extend ? samples.length - 1 : end;
  return {
    route: route.map(({ latitude, longitude }) => ({ latitude, longitude })),
    seconds: (samples[finalIndex].timestamp - samples[start].timestamp) / 1000,
    originalSeconds,
    distance: traceDistance(route),
    wins,
  };
}
