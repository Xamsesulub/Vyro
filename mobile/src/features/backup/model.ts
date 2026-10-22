import { sports, type Workout } from "../activities/model";

// Explicit portable fields: no social audience, credentials or competition proof.
export function backupPayload(workout: Workout, owner: string): Workout {
  const { id, title, notes, sport, distance, seconds, date, route, splits } =
    workout;
  const payload = {
    id,
    title,
    notes,
    sport,
    distance,
    seconds,
    date,
    route,
    splits,
    source: "gps" as const,
    visibility: "private" as const,
    ownerId: owner,
  };
  if (
    workout.source !== "gps" ||
    workout.ownerId !== owner ||
    !validBackup(payload, owner, id)
  )
    throw new Error(
      "Økten har data som ikke kan sikkerhetskopieres. Den lokale kopien er beholdt.",
    );
  return payload;
}
export function validBackup(
  value: unknown,
  owner: string,
  id: string,
): value is Workout {
  if (!value || typeof value !== "object") return false;
  const w = value as Workout;
  return (
    w.id === id &&
    /^[a-zA-Z0-9_-]{1,120}$/.test(id) &&
    w.ownerId === owner &&
    w.source === "gps" &&
    w.visibility === "private" &&
    sports.includes(w.sport) &&
    typeof w.title === "string" &&
    w.title.trim().length > 0 &&
    w.title.length <= 120 &&
    typeof w.notes === "string" &&
    w.notes.length <= 10000 &&
    Number.isFinite(w.distance) &&
    w.distance > 0 &&
    w.distance <= 5000 &&
    Number.isFinite(w.seconds) &&
    w.seconds > 0 &&
    w.seconds <= 2592000 &&
    typeof w.date === "string" &&
    Number.isFinite(Date.parse(w.date)) &&
    Array.isArray(w.route) &&
    w.route.length >= 2 &&
    w.route.length <= 20000 &&
    w.route.every(
      (p) =>
        p &&
        Number.isFinite(p.latitude) &&
        Math.abs(p.latitude) <= 90 &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.longitude) <= 180 &&
        (p.breakBefore === undefined || typeof p.breakBefore === "boolean"),
    ) &&
    (w.splits === undefined ||
      (Array.isArray(w.splits) &&
        w.splits.length <= Math.floor(w.distance) &&
        w.splits.every(
          (s, i) =>
            s &&
            s.kilometer === i + 1 &&
            Number.isFinite(s.seconds) &&
            s.seconds > 0 &&
            Number.isFinite(s.elapsedSeconds) &&
            s.elapsedSeconds <= w.seconds + 1 &&
            Math.abs(
              s.elapsedSeconds -
                (i ? w.splits![i - 1].elapsedSeconds : 0) -
                s.seconds,
            ) < 0.01,
        )))
  );
}
export const backupKey = (owner: string, id: string) => `${owner}:${id}`;
export function mergeBackups(
  local: Workout[],
  remote: Workout[],
  hidden: string[],
) {
  const existing = new Set(local.map((w) => backupKey(w.ownerId ?? "", w.id)));
  const excluded = new Set(hidden);
  const added = remote.filter((w) => {
    const key = backupKey(w.ownerId!, w.id);
    if (existing.has(key) || excluded.has(key)) return false;
    existing.add(key);
    return true;
  });
  return added.length
    ? [...added, ...local].sort((a, b) => b.date.localeCompare(a.date))
    : local;
}
