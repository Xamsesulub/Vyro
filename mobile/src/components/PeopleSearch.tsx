import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { client, Profile, socialError } from "../features/social/api";
import { Button, Txt, styles } from "./ui";
import { Avatar, Field } from "./SocialUi";

export function cleanPeopleQuery(value: string) {
  return value
    .replace(/[^\p{L}\p{N}_ '’-]/gu, "")
    .trim()
    .slice(0, 50);
}
export function PeopleSearch({
  userId,
  onChoose,
  excluded = [],
  initialQuery = "",
}: {
  userId: string;
  onChoose?: (person: Profile) => Promise<void>;
  excluded?: string[];
  initialQuery?: string;
}) {
  const [people, setPeople] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [term, setTerm] = useState(cleanPeopleQuery(initialQuery));
  const [query, setQuery] = useState(cleanPeopleQuery(initialQuery));
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const alive = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void revision; // Explicit refresh after a search or retry.
      alive.current = true;
      let live = true;
      const controller = new AbortController();
      setLoading(true);
      setError("");
      void (async () => {
        try {
          let q = client()
            .from("profiles")
            .select("id,username,display_name")
            .neq("id", userId)
            .order("display_name")
            .order("id")
            .limit(50);
          if (query)
            q = q.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`);
          const result = await q.abortSignal(controller.signal);
          if (result.error) throw result.error;
          const rows = result.data as Profile[];
          const follows = rows.length
            ? await client()
                .from("follows")
                .select("following_id")
                .eq("follower_id", userId)
                .in(
                  "following_id",
                  rows.map((p) => p.id),
                )
                .abortSignal(controller.signal)
            : { data: [], error: null };
          if (follows.error) throw follows.error;
          if (live) {
            setPeople(rows);
            setFollowing((follows.data ?? []).map((p) => p.following_id));
          }
        } catch (e) {
          if (live) setError(socialError(e));
        } finally {
          if (live) setLoading(false);
        }
      })();
      return () => {
        live = false;
        alive.current = false;
        controller.abort();
      };
    }, [userId, query, revision]),
  );
  const search = () => {
    setQuery(cleanPeopleQuery(term));
    setRevision((n) => n + 1);
  };
  async function choose(person: Profile) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(person.id);
    setError("");
    try {
      if (onChoose) await onChoose(person);
      else {
        const present = following.includes(person.id);
        const result = present
          ? await client()
              .from("follows")
              .delete()
              .eq("follower_id", userId)
              .eq("following_id", person.id)
          : await client().from("follows").upsert(
              { follower_id: userId, following_id: person.id },
              {
                onConflict: "follower_id,following_id",
                ignoreDuplicates: true,
              },
            );
        if (result.error) throw result.error;
        if (alive.current)
          setFollowing((v) =>
            present ? v.filter((id) => id !== person.id) : [...v, person.id],
          );
      }
    } catch (e) {
      if (alive.current) setError(socialError(e));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(null);
    }
  }
  const visible = people.filter((p) => !excluded.includes(p.id));
  return (
    <View style={{ gap: 18 }}>
      <Field
        accessibilityLabel="Søk etter navn eller brukernavn"
        placeholder="Navn eller brukernavn"
        value={term}
        onChangeText={setTerm}
        maxLength={50}
        returnKeyType="search"
        autoCapitalize="none"
        onSubmitEditing={search}
      />
      <Button
        title={loading ? "Søker …" : "Søk etter personer"}
        disabled={loading}
        secondary
        icon="search"
        onPress={search}
      />
      {!!error && <Txt>{error}</Txt>}
      {!loading && !error && !visible.length && (
        <Txt muted>
          {onChoose && people.length
            ? "Alle treff er allerede medlemmer eller invitert."
            : "Ingen personer funnet. Prøv et annet navn."}
        </Txt>
      )}
      {visible.map((person) => (
        <View key={person.id} style={[styles.row, { gap: 12 }]}>
          <Avatar name={person.display_name} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="700">{person.display_name}</Txt>
            <Txt muted size={12} numberOfLines={1}>
              @{person.username}
            </Txt>
          </View>
          <Button
            title={
              busy === person.id
                ? "Lagrer …"
                : onChoose
                  ? "Inviter"
                  : following.includes(person.id)
                    ? "Følger"
                    : "Følg"
            }
            secondary
            disabled={!!busy}
            onPress={() => void choose(person)}
          />
        </View>
      ))}
      {people.length === 50 && (
        <Txt muted size={12}>
          Viser inntil 50 personer. Skriv mer av navnet for å avgrense søket.
        </Txt>
      )}
    </View>
  );
}
