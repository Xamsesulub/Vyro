import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Button, Card, Txt } from "./ui";
import { client } from "../features/social/api";
import { isMissingReadFunction } from "../features/social/feed";
import { km } from "../features/activities/model";
type Event = {
  id: string;
  turf_id: string;
  distance_m: number;
  extended: boolean;
  actor: { display_name: string };
  previous: { display_name: string } | null;
};
export function TurfEvents({ userId }: { userId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const controller = new AbortController();
      async function load() {
        try {
          const result = await client()
            .rpc("vyro_turf_events")
            .abortSignal(controller.signal);
          if (!result.error) {
            if (live) {
              setEvents(result.data as Event[]);
              setError(false);
            }
            return;
          }
          if (!isMissingReadFunction(result.error)) throw result.error;
          const f = await client()
            .from("follows")
            .select("following_id")
            .eq("follower_id", userId)
            .limit(1000)
            .abortSignal(controller.signal);
          if (f.error) throw f.error;
          const r = await client()
            .from("turf_events")
            .select(
              "id,turf_id,distance_m,extended,actor:profiles!turf_events_actor_id_fkey(display_name),previous:profiles!turf_events_previous_owner_id_fkey(display_name)",
            )
            .in("actor_id", [userId, ...f.data.map((p) => p.following_id)])
            .order("created_at", { ascending: false })
            .limit(3)
            .abortSignal(controller.signal);
          if (r.error) throw r.error;
          if (live) {
            setEvents(r.data as unknown as Event[]);
            setError(false);
          }
        } catch {
          if (live) {
            setEvents([]);
            setError(true);
          }
        }
      }
      void load();
      return () => {
        live = false;
        controller.abort();
      };
    }, [userId]),
  );
  return (
    <>
      {events.map((e) => (
        <Card key={e.id}>
          <Txt weight="700">
            {e.previous
              ? `${e.actor.display_name} har tatt over sonen til ${e.previous.display_name}.`
              : `${e.actor.display_name} har opprettet en sone.`}
          </Txt>
          <Txt muted>
            {e.extended ? "Utvidet til" : "Løype på"} {km(e.distance_m / 1000)}{" "}
            km. Vil du utfordre den?
          </Txt>
          <Button
            title="Se gjeldende sone"
            secondary
            onPress={() =>
              router.push({ pathname: "/turf", params: { turfId: e.turf_id } })
            }
          />
        </Card>
      ))}
      {error && (
        <Txt muted size={12}>
          Kunne ikke hente sonehendelser. Åpne Soner for å prøve igjen.
        </Txt>
      )}
    </>
  );
}
