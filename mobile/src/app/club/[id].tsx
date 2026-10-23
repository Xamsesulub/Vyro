import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { Avatar, SocialHeader } from "../../components/SocialUi";
import { PeopleSearch } from "../../components/PeopleSearch";
import { Button, Screen, Txt, styles } from "../../components/ui";
import { useAuthStore } from "../../stores/useAuthStore";
import { client, socialError } from "../../features/social/api";
import { Club, Member, joinClub } from "../../features/clubs/api";

export default function ClubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>
      {user && <ClubDetail key={`${user}:${id}`} id={id} userId={user} />}
    </AccountGate>
  );
}
function ClubDetail({ id, userId }: { id: string; userId: string }) {
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [joined, setJoined] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [invite, setInvite] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      void revision; // Reload membership after an owner action or retry.
      const abort = new AbortController();
      setError("");
      void (async () => {
        try {
          const [info, people, invites, membership] = await Promise.all([
            client()
              .from("clubs")
              .select("id,name,description,owner_id,visibility,created_at")
              .eq("id", id)
              .abortSignal(abort.signal)
              .single(),
            client()
              .from("club_members")
              .select("user_id,profiles(id,username,display_name)")
              .eq("club_id", id)
              .order("joined_at")
              .limit(200)
              .abortSignal(abort.signal),
            client()
              .from("club_invitations")
              .select("invitee_id")
              .eq("club_id", id)
              .limit(200)
              .abortSignal(abort.signal),
            client()
              .from("club_members")
              .select("user_id")
              .eq("club_id", id)
              .eq("user_id", userId)
              .abortSignal(abort.signal),
          ]);
          if (info.error || people.error || invites.error || membership.error)
            throw (
              info.error || people.error || invites.error || membership.error
            );
          if (!abort.signal.aborted) {
            setClub(info.data);
            setMembers(people.data as unknown as Member[]);
            setPending(invites.data.map((i) => i.invitee_id));
            setJoined(!!membership.data.length);
          }
        } catch (e) {
          if (!abort.signal.aborted) setError(socialError(e));
        }
      })();
      return () => abort.abort();
    }, [id, userId, revision]),
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
      setConfirm(null);
    }
  }
  const owner = club?.owner_id === userId;
  return (
    <Screen>
      <SocialHeader title="Klubb" back />
      {!!error && (
        <>
          <Txt>{error}</Txt>
          <Button
            title="Prøv igjen"
            secondary
            onPress={() => setRevision((n) => n + 1)}
          />
        </>
      )}
      {!club && !error && <Txt muted>Laster klubb …</Txt>}
      {club && (
        <>
          <Avatar club name={club.name} />
          <Txt size={30} weight="800">
            {club.name}
          </Txt>
          {!!club.description && <Txt muted>{club.description}</Txt>}
          <Txt muted size={13}>
            {club.visibility === "open"
              ? "Åpen klubb"
              : "Privat klubb · kun inviterte"}
          </Txt>
          {!joined && club.visibility === "open" && (
            <Button
              title={busy ? "Blir med …" : "Bli med"}
              disabled={busy}
              onPress={() =>
                void action(async () => {
                  await joinClub(id);
                  setRevision((n) => n + 1);
                })
              }
            />
          )}
          {!joined && club.visibility === "private" && (
            <Button
              title="Se invitasjonen din"
              secondary
              onPress={() => router.replace("/community")}
            />
          )}
          {owner && (
            <Button
              title={invite ? "Lukk personsøk" : "Inviter personer"}
              icon="plus"
              onPress={() => setInvite(!invite)}
            />
          )}
          {!!notice && <Txt>{notice}</Txt>}
          {invite && owner && (
            <PeopleSearch
              userId={userId}
              excluded={[...members.map((m) => m.user_id), ...pending]}
              onChoose={async (person) => {
                const result = await client().rpc("invite_to_club", {
                  p_club: id,
                  p_person: person.id,
                });
                if (result.error) throw result.error;
                setPending((v) => [...v, person.id]);
                setNotice(
                  `Invitasjon sendt til ${person.display_name}. Den vises under Klubber hos mottakeren.`,
                );
              }}
            />
          )}
          {joined && (
            <Txt size={21} weight="700">
              Medlemmer
            </Txt>
          )}
          {members.map((member) => (
            <View key={member.user_id} style={[styles.row, { gap: 12 }]}>
              <Avatar name={member.profiles.display_name} />
              <View style={{ flex: 1 }}>
                <Txt weight="700">{member.profiles.display_name}</Txt>
                <Txt muted size={12}>
                  {member.user_id === club.owner_id ? "Eier" : "Medlem"}
                </Txt>
              </View>
              {owner && member.user_id !== userId && (
                <Button
                  title={
                    confirm === member.user_id ? "Bekreft fjerning" : "Fjern"
                  }
                  secondary
                  disabled={busy}
                  onPress={() => {
                    if (confirm !== member.user_id) {
                      setConfirm(member.user_id);
                      return;
                    }
                    void action(async () => {
                      const r = await client().rpc("manage_club", {
                        p_club: id,
                        p_person: member.user_id,
                      });
                      if (r.error) throw r.error;
                      setRevision((n) => n + 1);
                    });
                  }}
                />
              )}
            </View>
          ))}
          {members.length === 200 && (
            <Txt muted size={12}>
              Viser de første 200 medlemmene.
            </Txt>
          )}
          {owner && pending.length > 0 && (
            <Txt muted size={14}>
              {pending.length}{" "}
              {pending.length === 1
                ? "invitasjon venter"
                : "invitasjoner venter"}{" "}
              på svar.
            </Txt>
          )}
          {owner && (
            <Button
              title={
                confirm === "visibility"
                  ? club.visibility === "private"
                    ? "Bekreft: alle kan bli med"
                    : "Bekreft: kun inviterte"
                  : club.visibility === "private"
                    ? "Gjør klubben åpen"
                    : "Gjør klubben privat"
              }
              secondary
              disabled={busy}
              onPress={() => {
                if (confirm !== "visibility") {
                  setConfirm("visibility");
                  return;
                }
                void action(async () => {
                  const result = await client().rpc("set_club_visibility", {
                    p_club: id,
                    p_visibility:
                      club.visibility === "private" ? "open" : "private",
                  });
                  if (result.error) throw result.error;
                  setRevision((n) => n + 1);
                });
              }}
            />
          )}
          {confirm === "visibility" && (
            <Txt size={13} muted>
              {club.visibility === "private"
                ? "Navn og beskrivelse blir synlige under Åpne klubber. Alle med konto kan bli med."
                : "Klubben fjernes fra Åpne klubber. Nåværende medlemmer blir værende."}
            </Txt>
          )}
          {joined && (
            <Button
              title={
                confirm === "leave"
                  ? owner
                    ? "Bekreft: slett klubben"
                    : "Bekreft: forlat klubben"
                  : owner
                    ? "Slett klubb"
                    : "Forlat klubb"
              }
              secondary
              disabled={busy}
              onPress={() => {
                if (confirm !== "leave") {
                  setConfirm("leave");
                  return;
                }
                void action(async () => {
                  const r = await client().rpc(
                    owner ? "manage_club" : "leave_club",
                    owner ? { p_club: id, p_delete: true } : { p_club: id },
                  );
                  if (r.error) throw r.error;
                  router.replace("/community");
                });
              }}
            />
          )}
          {confirm && (
            <Button title="Avbryt" secondary onPress={() => setConfirm(null)} />
          )}
        </>
      )}
    </Screen>
  );
}
