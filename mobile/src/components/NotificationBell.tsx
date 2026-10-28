import { useCallback, useState } from "react";
import { AppState, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { IconButton } from "./SocialUi";
import { Txt, useTheme } from "./ui";
import { useAuthStore } from "../stores/useAuthStore";
import { client } from "../features/social/api";
export default function NotificationBell() {
  const owner = useAuthStore((s) => s.session?.user.id);
  const c = useTheme();
  const [value, setValue] = useState<{ owner: string; count: number }>();
  useFocusEffect(
    useCallback(() => {
      if (!owner) return;
      const ctl = new AbortController();
      let running = false;
      async function update() {
        if (running || AppState.currentState === "background") return;
        running = true;
        try {
          const r = await client()
            .from("social_notifications")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", owner!)
            .is("read_at", null)
            .abortSignal(ctl.signal);
          if (!r.error && !ctl.signal.aborted)
            setValue({ owner: owner!, count: r.count ?? 0 });
        } catch {
          /* Retry on next focus or poll. */
        } finally {
          running = false;
        }
      }
      void update();
      const timer = setInterval(() => void update(), 60000);
      const sub = AppState.addEventListener("change", (s) => {
        if (s === "active") void update();
      });
      return () => {
        ctl.abort();
        clearInterval(timer);
        sub.remove();
      };
    }, [owner]),
  );
  if (!owner) return null;
  const count = value?.owner === owner ? value.count : 0;
  return (
    <View>
      <IconButton
        name="bell"
        variant="elevated"
        label={count ? `Varsler, ${count} uleste` : "Varsler"}
        onPress={() => router.push("/notifications")}
      />
      {count > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -2,
            top: -2,
            borderRadius: 12,
            backgroundColor: c.accent,
            paddingHorizontal: 5,
            minWidth: 19,
            alignItems: "center",
          }}
        >
          <Txt size={11} weight="700" style={{ color: c.onAccent }}>
            {count > 99 ? "99+" : count}
          </Txt>
        </View>
      )}
    </View>
  );
}
