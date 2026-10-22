import type { Recording } from "./simulator";
export type KilometerSplit = {
  kilometer: number;
  seconds: number;
  elapsedSeconds: number;
};

export function withSplits(
  before: Recording,
  after: Recording,
  timestamp: number,
): Recording {
  if (
    !before.splitCheckpoint ||
    before.segmentStartedAt === undefined ||
    after.lastFix === before.lastFix
  )
    return after;
  const elapsed =
    (before.segmentSeconds ?? 0) +
    Math.max(0, (timestamp - before.segmentStartedAt) / 1000);
  const previousTime = before.lastDistanceSeconds ?? before.segmentSeconds ?? 0;
  if (after.distance <= before.distance)
    return { ...after, lastDistanceSeconds: elapsed };
  let checkpoint = before.splitCheckpoint;
  const splits = [...(before.splits ?? [])];
  for (
    let kilometer = Math.floor(before.distance) + 1;
    kilometer <= Math.floor(after.distance);
    kilometer++
  ) {
    const fraction =
      (kilometer - before.distance) / (after.distance - before.distance);
    const crossing = previousTime + (elapsed - previousTime) * fraction;
    if (
      kilometer === checkpoint.kilometer + 1 &&
      crossing > checkpoint.elapsedSeconds
    )
      splits.push({
        kilometer,
        seconds: crossing - checkpoint.elapsedSeconds,
        elapsedSeconds: crossing,
      });
    checkpoint = { kilometer, elapsedSeconds: crossing };
  }
  return {
    ...after,
    splits,
    splitCheckpoint: checkpoint,
    lastDistanceSeconds: elapsed,
  };
}
