import { useCallback, useState } from "react";
import { TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { Button, Screen, Txt, styles, useTheme } from "../../components/ui";
import { useAuthStore } from "../../stores/useAuthStore";
import { client, Profile, socialError } from "../../features/social/api";
export default function Community() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <Runners key={id} userId={id} />}</AccountGate>;
}
function Runners({ userId }: { userId: string }) {
  const c = useTheme();
  const [people, setPeople] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let live = true;
      async function load() {
        setLoading(true);
        setError("");
        try {
          let q = client()
            .from("profiles")
            .select("id,username,display_name")
            .neq("id", userId)
            .order("display_name")
            .limit(50);
          if (query)
            q = q.ilike("display_name", `%${query.replace(/[%_\\]/g, "")}%`);
          const [p, f] = await Promise.all([
            q,
            client()
              .from("follows")
              .select("following_id")
              .eq("follower_id", userId),
          ]);
          if (p.error || f.error) throw p.error || f.error;
          if (live) {
            setPeople(p.data ?? []);
            setFollowing((f.data ?? []).map((row) => row.following_id));
          }
        } catch (e) {
          if (live) setError(socialError(e));
        } finally {
          if (live) setLoading(false);
        }
      }
      void load();
      return () => {
        live = false;
      };
      // revision explicitly refreshes the same query after a tap.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, query, revision]),
  );
  async function toggle(id: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    const present = following.includes(id);
    try {
      const r = present
        ? await client()
            .from("follows")
            .delete()
            .eq("follower_id", userId)
            .eq("following_id", id)
        : await client().from("follows").upsert(
            { follower_id: userId, following_id: id },
            {
              onConflict: "follower_id,following_id",
              ignoreDuplicates: true,
            },
          );
      if (r.error) throw r.error;
      setFollowing((v) => (present ? v.filter((x) => x !== id) : [...v, id]));
    } catch (e) {
      setError(socialError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Txt size={28} weight="700">
        Finn løpere
      </Txt>
      <TextInput
        accessibilityLabel="Søk etter navn"
        placeholder="Søk etter navn"
        placeholderTextColor={c.muted}
        value={term}
        onChangeText={setTerm}
        maxLength={50}
        style={{
          padding: 16,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          color: c.text,
        }}
      />
      <Button
        title={loading ? "Laster …" : "Søk / oppdater"}
        disabled={loading}
        onPress={() => {
          setQuery(term.trim());
          setRevision((n) => n + 1);
        }}
      />
      {!!error && <Txt>{error}</Txt>}
      {!loading && !error && !people.length && (
        <Txt muted>Ingen løpere funnet.</Txt>
      )}
      {people.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Txt weight="700">{p.display_name}</Txt>
            <Txt muted size={11}>
              @{p.username}
            </Txt>
          </View>
          <Button
            title={following.includes(p.id) ? "Slutt å følge" : "Følg"}
            secondary
            disabled={busy}
            onPress={() => toggle(p.id)}
          />
        </View>
      ))}
      {people.length === 50 && (
        <Txt muted size={12}>
          Viser 50 løpere. Søk på navn for å finne flere.
        </Txt>
      )}
    </Screen>
  );
}
