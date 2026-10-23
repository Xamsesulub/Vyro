import { useCallback, useRef, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { Avatar, Field, SocialHeader } from "../../components/SocialUi";
import {
  Button,
  Chip,
  Screen,
  Txt,
  styles,
  useTheme,
} from "../../components/ui";
import { useAuthStore } from "../../stores/useAuthStore";
import { socialError } from "../../features/social/api";
import {
  Club,
  Invitation,
  createClub,
  loadClubs,
  respondInvitation,
  validateClub,
  loadClubPage,
  joinClub,
} from "../../features/clubs/api";

export default function Clubs() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <ClubList key={id} userId={id} />}</AccountGate>;
}
function ClubList({ userId }: { userId: string }) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [discovery, setDiscovery] = useState<Club[]>([]);
  const [moreMine, setMoreMine] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Club["visibility"]>("private");
  useFocusEffect(
    useCallback(() => {
      void revision; // Refresh invitations after accepting or declining.
      const control = new AbortController();
      setLoading(true);
      setError("");
      loadClubs(userId, control.signal)
        .then((result) => {
          if (!control.signal.aborted) {
            setClubs(result.clubs.items);
            setDiscovery(result.discovery.items);
            setMoreMine(result.clubs.more);
            setMoreOpen(result.discovery.more);
            setInvitations(result.invitations);
          }
        })
        .catch((e) => {
          if (!control.signal.aborted) setError(socialError(e));
        })
        .finally(() => {
          if (!control.signal.aborted) setLoading(false);
        });
      return () => control.abort();
    }, [userId, revision]),
  );
  async function action(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(socialError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <SocialHeader title="Klubber" />
      <Button
        title={creating ? "Lukk nytt klubbskjema" : "Opprett klubb"}
        icon="plus"
        secondary
        onPress={() => setCreating(!creating)}
        disabled={busy}
      />
      {creating && (
        <View
          style={{
            gap: 14,
            padding: 18,
            backgroundColor: c.raised,
            borderRadius: 20,
          }}
        >
          <Txt size={20} weight="700">
            Ny klubb
          </Txt>
          <Field
            accessibilityLabel="Klubbnavn"
            placeholder="Gi klubben et navn"
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
          <Field
            accessibilityLabel="Beskriv klubben"
            placeholder="Hva vil dere gjøre sammen? (valgfritt)"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
          <View style={styles.wrap}>
            <Chip
              title="Privat"
              selected={visibility === "private"}
              onPress={() => setVisibility("private")}
            />
            <Chip
              title="Åpen"
              selected={visibility === "open"}
              onPress={() => setVisibility("open")}
            />
          </View>
          <Txt muted size={13}>
            {visibility === "private"
              ? "Kun inviterte kan bli med."
              : "Vises under Åpne klubber. Alle med konto kan bli med."}
          </Txt>
          <Button
            title={
              busy
                ? "Oppretter …"
                : visibility === "open"
                  ? "Opprett åpen klubb"
                  : "Opprett privat klubb"
            }
            disabled={busy || name.trim().length < 2}
            onPress={() => {
              try {
                validateClub(name, description);
              } catch (e) {
                setError((e as Error).message);
                return;
              }
              void action(async () => {
                const id = await createClub(name, description, visibility);
                setCreating(false);
                setName("");
                setDescription("");
                setVisibility("private");
                router.push({ pathname: "/club/[id]", params: { id } });
              });
            }}
          />
        </View>
      )}
      {!!error && (
        <View style={{ gap: 12 }}>
          <Txt>{error}</Txt>
          <Button
            title="Prøv igjen"
            secondary
            disabled={loading}
            onPress={() => setRevision((n) => n + 1)}
          />
        </View>
      )}
      {!!invitations.length && (
        <View style={{ gap: 14 }}>
          <Txt size={20} weight="700">
            Invitasjoner · {invitations.length}
          </Txt>
          {invitations.map((invite) => (
            <View
              key={invite.id}
              style={{
                gap: 14,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 20,
                padding: 18,
              }}
            >
              <View style={[styles.row, { gap: 12 }]}>
                <Avatar club name={invite.clubs.name} />
                <View style={{ flex: 1 }}>
                  <Txt weight="700">{invite.clubs.name}</Txt>
                  <Txt muted size={13}>
                    {invite.clubs.description || "Du er invitert til klubben."}
                  </Txt>
                </View>
              </View>
              <View style={styles.wrap}>
                <Button
                  title="Bli med"
                  disabled={busy}
                  onPress={() =>
                    void action(async () => {
                      await respondInvitation(invite.id, true);
                      setRevision((n) => n + 1);
                    })
                  }
                />
                <Button
                  title="Avslå"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void action(async () => {
                      await respondInvitation(invite.id, false);
                      setRevision((n) => n + 1);
                    })
                  }
                />
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={styles.row}>
        <Txt size={21} weight="700">
          Dine klubber
        </Txt>
        <Txt muted size={13}>
          {loading
            ? "Laster …"
            : `${clubs.length} ${clubs.length === 1 ? "klubb" : "klubber"}`}
        </Txt>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {clubs.map((club) => (
          <Pressable
            key={club.id}
            accessibilityRole="button"
            accessibilityLabel={`Åpne ${club.name}`}
            onPress={() =>
              router.push({ pathname: "/club/[id]", params: { id: club.id } })
            }
            style={({ pressed }) => ({
              width: width < 360 ? "100%" : "48%",
              flexGrow: 1,
              borderWidth: 1,
              borderColor: c.border,
              padding: 18,
              borderRadius: 20,
              gap: 14,
              backgroundColor: pressed ? c.raised : c.surface,
            })}
          >
            <Avatar club name={club.name} />
            <Txt size={19} weight="700">
              {club.name}
            </Txt>
            <Txt muted size={13}>
              {club.member_count ?? 0}{" "}
              {club.member_count === 1 ? "medlem" : "medlemmer"} ·{" "}
              {club.visibility === "open" ? "Åpen" : "Privat"}
            </Txt>
            <Txt size={14} weight="600" style={{ color: c.accent }}>
              Åpne klubb →
            </Txt>
          </Pressable>
        ))}
      </View>
      {moreMine && (
        <Button
          title="Vis flere av dine klubber"
          secondary
          disabled={busy || loading}
          onPress={() =>
            void action(async () => {
              const page = await loadClubPage("mine", clubs.at(-1));
              setClubs((old) => [
                ...old,
                ...page.items.filter(
                  (item) => !old.some((c) => c.id === item.id),
                ),
              ]);
              setMoreMine(page.more);
            })
          }
        />
      )}
      {!loading && !error && !clubs.length && (
        <Txt muted size={14}>
          Du er ikke med i noen klubber ennå.
        </Txt>
      )}
      <Txt size={21} weight="700">
        Åpne klubber
      </Txt>
      {discovery.map((club) => (
        <View
          key={club.id}
          style={{
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 20,
            padding: 18,
            gap: 14,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Se ${club.name}`}
            onPress={() =>
              router.push({ pathname: "/club/[id]", params: { id: club.id } })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              minHeight: 48,
            }}
          >
            <Avatar club name={club.name} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt size={20} weight="700">
                {club.name}
              </Txt>
              <Txt size={13} muted>
                {club.member_count ?? 0}{" "}
                {club.member_count === 1 ? "medlem" : "medlemmer"} · Åpen klubb
              </Txt>
            </View>
          </Pressable>
          {!!club.description && (
            <Txt size={14} muted numberOfLines={3}>
              {club.description}
            </Txt>
          )}
          <Button
            title="Bli med"
            disabled={busy || loading}
            onPress={() =>
              void action(async () => {
                await joinClub(club.id);
                setRevision((n) => n + 1);
              })
            }
          />
        </View>
      ))}
      {moreOpen && (
        <Button
          title="Vis flere åpne klubber"
          secondary
          disabled={busy || loading}
          onPress={() =>
            void action(async () => {
              const page = await loadClubPage("discover", discovery.at(-1));
              setDiscovery((old) => [
                ...old,
                ...page.items.filter(
                  (item) => !old.some((c) => c.id === item.id),
                ),
              ]);
              setMoreOpen(page.more);
            })
          }
        />
      )}
      {!loading && !error && !discovery.length && (
        <Txt muted size={14}>
          Ingen flere åpne klubber akkurat nå.
        </Txt>
      )}
    </Screen>
  );
}
