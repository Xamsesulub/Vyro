import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "../../stores/useAuthStore";
import { loadOwnProfile, useProfileStore } from "../../stores/useProfileStore";

export function useOwnProfile() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useProfileStore((s) => s.profile);
  const errorFor = useProfileStore((s) => s.errorFor);
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const request = new AbortController();
      void loadOwnProfile(userId, request.signal);
      return () => request.abort();
    }, [userId]),
  );
  return {
    profile: profile?.id === userId ? profile : null,
    failed: !!userId && errorFor === userId,
  };
}
