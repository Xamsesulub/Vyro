import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Page, SettingsRow } from "../../components/SettingsUi";
import { IconButton } from "../../components/SocialUi";
import { Button, Chip, Txt, useTheme } from "../../components/ui";
import { duration, km } from "../activities/model";
import { loadTurfs, turfError, type TurfPage, type TurfScope } from "./api";

export function TurfBrowser({ userId }: { userId: string }) {
  const [scope, setScope] = useState<TurfScope>("circle");
  return (
    <TurfList key={scope} userId={userId} scope={scope} onScope={setScope} />
  );
}
function TurfList({
  userId,
  scope,
  onScope,
}: {
  userId: string;
  scope: TurfScope;
  onScope: (scope: TurfScope) => void;
}) {
  const c = useTheme();
  const [page, setPage] = useState<TurfPage>({ items: [], next: null });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const request = useRef<AbortController | null>(null);
  const paging = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      request.current = controller;
      paging.current = false;
      setMore(false);
      setLoading(true);
      setError("");
      void loadTurfs(userId, scope, null, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setPage(data);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(turfError(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
      // Manual refresh deliberately restarts the focus subscription.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, scope, reload]),
  );
  async function loadMore() {
    const controller = request.current;
    if (
      !page.next ||
      loading ||
      paging.current ||
      !controller ||
      controller.signal.aborted
    )
      return;
    paging.current = true;
    setMore(true);
    setError("");
    try {
      const next = await loadTurfs(userId, scope, page.next, controller.signal);
      if (!controller.signal.aborted)
        setPage((old) => ({
          items: [
            ...new Map(
              [...old.items, ...next.items].map((t) => [t.id, t]),
            ).values(),
          ],
          next: next.next,
        }));
    } catch (e) {
      if (!controller.signal.aborted) setError(turfError(e));
    } finally {
      if (!controller.signal.aborted) {
        paging.current = false;
        setMore(false);
      }
    }
  }
  return (
    <Page
      title="Soner"
      fallback="/(tabs)/map"
      scroll={false}
      right={
        <IconButton
          name="refresh"
          label="Oppdater soner"
          disabled={loading || more}
          onPress={() => setReload((n) => n + 1)}
        />
      }
    >
      <View style={{ padding: 16, gap: 16, backgroundColor: c.surface }}>
        <Button
          title="Legg ut sone"
          icon="plus"
          onPress={() =>
            router.push({ pathname: "/turf", params: { mode: "new" } })
          }
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              ["circle", "Mine og venner"],
              ["mine", "Mine"],
              ["all", "Alle"],
            ] as const
          ).map(([value, title]) => (
            <Chip
              key={value}
              title={title}
              selected={scope === value}
              onPress={() => onScope(value)}
            />
          ))}
        </View>
      </View>
      <FlatList
        data={page.items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          paddingBottom: 24,
        }}
        ListHeaderComponent={
          <View style={{ padding: 20, gap: 8 }}>
            <Txt muted size={14}>
              {scope === "all"
                ? "Utforsk løypene andre har delt."
                : scope === "mine"
                  ? "Soner du har laget eller eier nå."
                  : "Dine soner og soner fra løpere du følger."}
            </Txt>
            {loading && (
              <ActivityIndicator
                accessibilityLabel="Henter soner"
                color={c.accent}
              />
            )}
          </View>
        }
        renderItem={({ item: t }) => (
          <SettingsRow
            title={t.name}
            icon="map"
            label={`Se ${t.name}`}
            description={`${t.owner_id === userId ? "Du eier sonen" : `${t.profiles?.display_name ?? "Løper"} eier sonen`} · ${km(t.distance_m / 1000)} km · ${duration(t.seconds)} å slå`}
            onPress={() =>
              router.push({ pathname: "/turf", params: { turfId: t.id } })
            }
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={{ padding: 22, gap: 12 }}>
              <Txt size={22} weight="700">
                {scope === "all" ? "Vær først ute" : "Her kommer sonene dine"}
              </Txt>
              <Txt muted>
                Legg ut en sone fra en lagret løpetur. Andre kan se løypa og
                prøve å slå tiden din.
              </Txt>
              {scope === "circle" && (
                <Button
                  title="Finn venner"
                  secondary
                  onPress={() => router.push("/people")}
                />
              )}
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ padding: 16, gap: 12 }}>
            {!!error && <Txt accessibilityRole="alert">{error}</Txt>}
            {!!error && !page.next && (
              <Button
                title="Prøv igjen"
                secondary
                disabled={loading}
                onPress={() => setReload((n) => n + 1)}
              />
            )}
            {page.next && (
              <Button
                title={
                  more
                    ? "Henter flere …"
                    : error
                      ? "Prøv å hente flere igjen"
                      : "Vis flere soner"
                }
                secondary
                disabled={loading || more}
                onPress={loadMore}
              />
            )}
          </View>
        }
      />
    </Page>
  );
}
