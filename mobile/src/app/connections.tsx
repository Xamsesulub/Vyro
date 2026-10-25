import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Page, SettingsGroup, SettingsRow } from "../components/SettingsUi";
import { AccountGate } from "../components/AccountGate";
import { Button, Txt } from "../components/ui";
import { useAuthStore } from "../stores/useAuthStore";
import {
  loadConnections,
  type ConnectionKind,
} from "../features/social/connections";
import { socialError, type Profile } from "../features/social/api";
export default function Connections() {
  const id = useAuthStore((s) => s.session?.user.id);
  const params = useLocalSearchParams<{ tab?: string }>();
  const kind = params.tab === "following" ? "following" : "followers";
  return (
    <AccountGate>
      {id && <ConnectionList key={`${id}:${kind}`} owner={id} kind={kind} />}
    </AccountGate>
  );
}
function ConnectionList({
  owner,
  kind,
}: {
  owner: string;
  kind: ConnectionKind;
}) {
  const [people, setPeople] = useState<Profile[]>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const offset = useRef(0);
  const load = useCallback(
    async (append = false) => {
      request.current?.abort();
      const control = new AbortController();
      request.current = control;
      setBusy(true);
      setError("");
      try {
        const result = await loadConnections(
          owner,
          kind,
          append ? offset.current : 0,
          control.signal,
        );
        if (control.signal.aborted) return;
        setPeople((previous) =>
          append
            ? [
                ...previous,
                ...result.people.filter(
                  (p) => !previous.some((old) => old.id === p.id),
                ),
              ]
            : result.people,
        );
        offset.current = (append ? offset.current : 0) + result.people.length;
        setMore(result.more);
      } catch (e) {
        if (!control.signal.aborted) setError(socialError(e));
      } finally {
        if (!control.signal.aborted) setBusy(false);
      }
    },
    [owner, kind],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => request.current?.abort();
    }, [load]),
  );
  return (
    <Page
      title={kind === "followers" ? "Følgere" : "Følger"}
      fallback="/profile"
    >
      <SettingsGroup>
        {people.map((p) => (
          <SettingsRow
            key={p.id}
            title={p.display_name}
            description={`@${p.username}`}
            onPress={() =>
              router.push({
                pathname: "/people",
                params: { query: p.username },
              })
            }
          />
        ))}
      </SettingsGroup>
      <View style={{ padding: 22, gap: 14 }}>
        {busy && <Txt muted>Henter personer …</Txt>}
        {!!error && (
          <>
            <Txt>{error}</Txt>
            <Button title="Prøv igjen" onPress={() => void load()} />
          </>
        )}
        {!busy && !error && !people.length && (
          <Txt muted>
            {kind === "followers"
              ? "Du har ingen følgere ennå."
              : "Du følger ingen ennå. Finn noen å dele turene med."}
          </Txt>
        )}
        {more && (
          <Button
            title="Vis flere"
            disabled={busy}
            secondary
            onPress={() => void load(true)}
          />
        )}
        <Button
          title="Finn venner"
          secondary
          onPress={() => router.push("/people")}
        />
      </View>
    </Page>
  );
}
