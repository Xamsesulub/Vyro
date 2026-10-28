import { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { Page, SettingsGroup } from "../components/SettingsUi";
import { Avatar, IconButton } from "../components/SocialUi";
import { Button, Txt, useTheme } from "../components/ui";
import { useAuthStore } from "../stores/useAuthStore";
import { client, socialError } from "../features/social/api";
import { visibleUsername } from "../features/social/display";
import { loadNotificationTarget } from "../features/social/notificationTarget";
import {
  loadNotices,
  loadRequests,
  respondFollow,
  noticeText,
  type Notice,
  type FollowRequest,
} from "../features/social/notifications";

export default function NotificationsPage() {
  const owner = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>{owner && <Inbox key={owner} owner={owner} />}</AccountGate>
  );
}
function Inbox({ owner }: { owner: string }) {
  const c = useTheme();
  const [items, setItems] = useState<Notice[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const control = useRef<AbortController | null>(null);
  const cursor = useRef<Notice | undefined>(undefined);
  const action = useRef(false);
  const refresh = useCallback(
    async (append = false) => {
      control.current?.abort();
      const ctl = new AbortController();
      control.current = ctl;
      setBusy(true);
      setError("");
      try {
        const [page, pending] = await Promise.all([
          loadNotices(owner, ctl.signal, append ? cursor.current : undefined),
          loadRequests(owner, ctl.signal),
        ]);
        if (ctl.signal.aborted) return;
        setItems((old) =>
          append
            ? [
                ...old,
                ...page.rows.filter((p) => !old.some((o) => o.id === p.id)),
              ]
            : page.rows,
        );
        cursor.current = page.rows.at(-1);
        setMore(page.more);
        setRequests(pending);
      } catch (e) {
        if (!ctl.signal.aborted) setError(socialError(e));
      } finally {
        if (!ctl.signal.aborted) setBusy(false);
      }
    },
    [owner],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => control.current?.abort();
    }, [refresh]),
  );
  async function decide(id: string, accept: boolean) {
    if (action.current) return;
    action.current = true;
    setActing(id);
    setError("");
    try {
      await respondFollow(owner, id, accept);
      await refresh();
    } catch (e) {
      setError(socialError(e));
    } finally {
      action.current = false;
      setActing(null);
    }
  }
  async function openNotice(n: Notice) {
    if (action.current) return;
    action.current = true;
    setActing(n.id);
    setError("");
    try {
      const target = await loadNotificationTarget(owner, n.id);
      if (!target) {
        setError("Innlegget eller varselet er ikke tilgjengelig lenger.");
        return;
      }
      setItems((old) =>
        old.map((item) =>
          item.id === n.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
      if (target.postId)
        router.push({
          pathname: "/social-post",
          params: {
            id: target.postId,
            type: target.type,
            comments: target.comments ? "1" : "0",
          },
        });
      else
        router.push({
          pathname: "/people",
          params: { query: target.username },
        });
    } catch (e) {
      setError(socialError(e));
    } finally {
      action.current = false;
      setActing(null);
    }
  }
  return (
    <Page
      title="Varsler"
      fallback="/(tabs)"
      right={
        <IconButton
          name="settings"
          label="Varselinnstillinger"
          onPress={() => router.push("/settings/notifications")}
        />
      }
    >
      <View style={{ padding: 22, gap: 12 }}>
        <Button
          secondary
          title={busy ? "Henter …" : "Oppdater"}
          disabled={busy || !!acting}
          onPress={() => void refresh()}
        />
        {!!error && <Txt accessibilityRole="alert">{error}</Txt>}
      </View>
      {!!requests.length && (
        <SettingsGroup
          title="Følgeforespørsler"
          note={
            requests.length === 50
              ? "Viser de 50 eldste forespørslene. Flere vises når du behandler disse."
              : undefined
          }
        >
          {requests.map((r) => (
            <View
              key={r.requester_id}
              style={{
                padding: 20,
                gap: 12,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Avatar
                  name={r.profiles.display_name}
                  path={r.profiles.avatar_path}
                />
                <View style={{ flex: 1 }}>
                  <Txt weight="700">{r.profiles.display_name}</Txt>
                  {visibleUsername(r.profiles.username) && (
                    <Txt muted size={13}>
                      {visibleUsername(r.profiles.username)}
                    </Txt>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={acting === r.requester_id ? "Lagrer …" : "Godkjenn"}
                    disabled={!!acting || busy}
                    onPress={() => void decide(r.requester_id, true)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    secondary
                    title="Avslå"
                    disabled={!!acting || busy}
                    onPress={() => void decide(r.requester_id, false)}
                  />
                </View>
              </View>
            </View>
          ))}
        </SettingsGroup>
      )}
      <SettingsGroup title="Siste nytt">
        {items.map((n) => (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            disabled={busy || !!acting}
            onPress={() => void openNotice(n)}
            style={{
              padding: 20,
              gap: 12,
              flexDirection: "row",
              alignItems: "center",
              borderBottomWidth: 1,
              borderColor: c.border,
              backgroundColor: n.read_at ? c.surface : c.raised,
            }}
          >
            <Avatar
              name={n.profiles.display_name}
              path={n.profiles.avatar_path}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt>
                <Txt weight="700">{n.profiles.display_name}</Txt>{" "}
                {noticeText[n.kind] ?? "har en oppdatering til deg"}.
              </Txt>
              <Txt muted size={12}>
                {new Date(n.created_at).toLocaleString("nb-NO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {!n.read_at ? " · Ulest" : ""}
              </Txt>
            </View>
          </Pressable>
        ))}
      </SettingsGroup>
      <View style={{ padding: 22, gap: 12 }}>
        {!busy && !error && !items.length && (
          <Txt muted>
            Her kommer følgerne dine, kommentarer, likerklikk og nye innlegg.
          </Txt>
        )}
        {items.some((n) => !n.read_at) && (
          <Button
            secondary
            title="Marker disse som lest"
            disabled={busy || !!acting}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                // Limit by timestamp so a newer event reusing an ID is not marked read.
                const result = await client()
                  .from("social_notifications")
                  .update({ read_at: new Date().toISOString() })
                  .eq("recipient_id", owner)
                  .in(
                    "id",
                    items.map((n) => n.id),
                  )
                  .lte("created_at", items[0].created_at);
                if (result.error) throw result.error;
                await refresh();
              } catch (e) {
                setError(socialError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
        {more && (
          <Button
            secondary
            title="Vis eldre varsler"
            disabled={busy || !!acting}
            onPress={() => void refresh(true)}
          />
        )}
      </View>
    </Page>
  );
}
