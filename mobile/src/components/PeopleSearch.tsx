import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { client, Profile, socialError } from "../features/social/api";
import { Button, Txt, styles } from "./ui";
import { Avatar, Field } from "./SocialUi";
import { changeFollow } from "../features/social/profiles";
import { visibleUsername } from "../features/social/display";

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
  const [requested, setRequested] = useState<string[]>([]);
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
            .select("id,username,display_name,is_private,avatar_path")
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
          const requests = await client()
            .from("follow_requests")
            .select("recipient_id")
            .eq("requester_id", userId)
            .in(
              "recipient_id",
              rows.map((p) => p.id),
            )
            .abortSignal(controller.signal);
          if (requests.error) throw requests.error;
          if (live) {
            setPeople(rows);
            setFollowing((follows.data ?? []).map((p) => p.following_id));
            setRequested((requests.data ?? []).map((p) => p.recipient_id));
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
        const present =
          following.includes(person.id) || requested.includes(person.id);
        const state = await changeFollow(userId, person.id, !present);
        if (alive.current) {
          setFollowing((v) => [
            ...v.filter((id) => id !== person.id),
            ...(state === "following" ? [person.id] : []),
          ]);
          setRequested((v) => [
            ...v.filter((id) => id !== person.id),
            ...(state === "requested" ? [person.id] : []),
          ]);
        }
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
          <Avatar name={person.display_name} path={person.avatar_path} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="700">{person.display_name}</Txt>
            {visibleUsername(person.username) && (
              <Txt muted size={12} numberOfLines={1}>
                {visibleUsername(person.username)}
              </Txt>
            )}
            {!!person.is_private && (
              <Txt muted size={12}>
                Privat konto
              </Txt>
            )}
          </View>
          <Button
            title={
              busy === person.id
                ? "Lagrer …"
                : onChoose
                  ? "Inviter"
                  : following.includes(person.id)
                    ? "Følger"
                    : requested.includes(person.id)
                      ? "Avbryt forespørsel"
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
