import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../stores/useAuthStore";
import { loadNotifications } from "../features/social/notificationRuntime";
import {
  isNotificationId,
  loadNotificationTarget,
} from "../features/social/notificationTarget";
import {
  enablePush,
  isOwnNotification,
  pushPreference,
  pushSupported,
} from "../features/social/push";
let lastOpened: string | undefined;
export default function NotificationObserver() {
  const owner = useAuthStore((s) => s.session?.user.id);
  useEffect(() => {
    if (!pushSupported) return;
    let active = true;
    let remove: (() => void) | undefined;
    let refreshing = false;
    async function refresh() {
      if (!owner || refreshing) return;
      refreshing = true;
      try {
        if (await pushPreference(owner)) await enablePush(owner, false);
      } catch {
        /* Settings offer explicit retry. */
      } finally {
        refreshing = false;
      }
    }
    void refresh();
    const foreground = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    void loadNotifications()
      .then((N) => {
        if (!active) return;
        N.setNotificationHandler({
          handleNotification: async (notification) => {
            const own = isOwnNotification(
              notification.request.content.data,
              useAuthStore.getState().session?.user.id,
            );
            return {
              shouldPlaySound: own,
              shouldSetBadge: false,
              shouldShowBanner: own,
              shouldShowList: own,
            };
          },
        });
        const open = (
          response: ReturnType<typeof N.getLastNotificationResponse>,
        ) => {
          if (
            !active ||
            !response ||
            response.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER
          )
            return;
          if (
            !isOwnNotification(
              response.notification.request.content.data,
              owner,
            )
          )
            return;
          const id = response.notification.request.identifier;
          if (id === lastOpened) return;
          lastOpened = id;
          const noticeId =
            response.notification.request.content.data?.notificationId;
          const openTarget = async () => {
            try {
              const target =
                owner && isNotificationId(noticeId)
                  ? await loadNotificationTarget(owner, noticeId)
                  : null;
              if (!active || useAuthStore.getState().session?.user.id !== owner)
                return;
              if (target?.postId)
                router.push({
                  pathname: "/social-post",
                  params: {
                    id: target.postId,
                    type: target.type,
                    comments: target.comments ? "1" : "0",
                  },
                });
              else router.push("/notifications");
            } catch {
              if (active && useAuthStore.getState().session?.user.id === owner)
                router.push("/notifications");
            }
          };
          void openTarget();
          void N.clearLastNotificationResponseAsync();
        };
        const sub = N.addNotificationResponseReceivedListener(open);
        const token = N.addPushTokenListener(() => void refresh());
        open(N.getLastNotificationResponse());
        remove = () => {
          sub.remove();
          token.remove();
        };
      })
      .catch(() => {});
    return () => {
      active = false;
      remove?.();
      foreground.remove();
    };
  }, [owner]);
  return null;
}
