import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { Page, PageNote } from "../../components/SettingsUi";
import { Button, Txt } from "../../components/ui";
import { useAuthStore } from "../../stores/useAuthStore";
import { client, socialError } from "../../features/social/api";
import { requireOwner } from "../../features/social/profiles";
export default function Blocked() {
  const owner = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>
      {owner && <BlockedList key={owner} owner={owner} />}
    </AccountGate>
  );
}
function BlockedList({ owner }: { owner: string }) {
  const [rows, setRows] = useState<{ id: string; display_name: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setBusy(true);
    try {
      const r = await client().rpc("vyro_my_blocks");
      if (r.error) throw r.error;
      requireOwner(owner);
      if (request.current === id) {
        setRows(r.data ?? []);
        setError("");
      }
    } catch (e) {
      if (request.current === id) setError(socialError(e));
    } finally {
      if (request.current === id) setBusy(false);
    }
  }, [owner]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );
  return (
    <Page title="Blokkerte brukere" plain>
      <PageNote>Oppheving gjenoppretter ikke tidligere følgeforhold.</PageNote>
      <View style={{ padding: 22, gap: 18 }}>
        {busy && <Txt muted>Henter …</Txt>}
        {!busy && !error && !rows.length && <Txt>Ingen blokkerte brukere.</Txt>}
        {rows.map((p) => (
          <View key={p.id} style={{ gap: 8 }}>
            <Txt weight="700">{p.display_name}</Txt>
            <Button
              title="Opphev blokkering"
              secondary
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                setError("");
                try {
                  requireOwner(owner);
                  const r = await client().rpc("vyro_block", {
                    p_target: p.id,
                    p_block: false,
                  });
                  if (r.error) throw r.error;
                  requireOwner(owner);
                  setRows((current) =>
                    current.filter((row) => row.id !== p.id),
                  );
                } catch (e) {
                  setError(socialError(e));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </View>
        ))}
        {!!error && (
          <>
            <Txt>{error}</Txt>
            <Button
              title="Prøv igjen"
              secondary
              onPress={() => {
                void load();
              }}
            />
          </>
        )}
      </View>
    </Page>
  );
}
