import { useCallback, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { useLocationStore } from "../../stores/useLocationStore";

// Keeps live position on while the calling screen is focused and `enabled`.
export function useLiveLocation(enabled = true) {
  const s = useLocationStore();
  const check = s.check;
  useEffect(() => {
    if (enabled) check();
  }, [enabled, check]);
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      return useLocationStore.getState().view();
    }, [enabled]),
  );
  return s;
}
