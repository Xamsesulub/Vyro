import { useCallback, useMemo, useState } from "react";
import { mapErrorStatus, mapLoadError } from "./loadError";

/** User-driven retry only. Repeated tile failures must not extend the cooldown. */
export function useMapRecovery(base: string) {
  const [attempt, setAttempt] = useState(0);
  const generation = useMemo(() => ({ base, attempt }), [base, attempt]);
  const [failed, setFailed] = useState<{
    generation: typeof generation;
    message: string;
    retryAt: number;
  } | null>(null);
  const failure = failed?.generation === generation ? failed : null;
  const reportFailure = useCallback(
    (error: unknown) => {
      const message = mapLoadError(error);
      setFailed((previous) => {
        if (previous?.generation === generation && previous.message === message)
          return previous;
        return {
          generation,
          message,
          retryAt: Math.max(
            previous?.generation === generation ? previous.retryAt : 0,
            Date.now() + (mapErrorStatus(error) === 429 ? 30_000 : 1_000),
          ),
        };
      });
    },
    [generation],
  );
  const retry = () => {
    if (!failure || Date.now() < failure.retryAt) return false;
    setAttempt((value) => value + 1);
    return true;
  };
  return { attempt, failure, reportFailure, retry };
}
