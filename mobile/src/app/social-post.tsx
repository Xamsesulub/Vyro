import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { Page } from "../components/SettingsUi";
import { Button, Txt } from "../components/ui";
import { CloudPost } from "../components/CloudPost";
import { PlacePost } from "../components/PlacePost";
import { useAuthStore } from "../stores/useAuthStore";
import {
  client,
  profileColumns,
  socialError,
  type Post,
} from "../features/social/api";
import { type PlacePost as Place } from "../features/places/model";
import { isNotificationId } from "../features/social/notificationTarget";
import { requireOwner } from "../features/social/profiles";

export default function SharedPostPage() {
  const [revision, setRevision] = useState(0);
  const { id, type, comments } = useLocalSearchParams<{
    id: string;
    type: string;
    comments: string;
  }>();
  const owner = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>
      {owner && (
        <Content
          key={`${owner}:${type}:${id}:${revision}`}
          owner={owner}
          id={id}
          place={type === "place"}
          comments={comments === "1"}
          retry={() => setRevision((n) => n + 1)}
        />
      )}
    </AccountGate>
  );
}
function Content({
  owner,
  id,
  place,
  comments,
  retry,
}: {
  owner: string;
  id: string;
  place: boolean;
  comments: boolean;
  retry: () => void;
}) {
  const [post, setPost] = useState<Post | Place | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      const ctl = new AbortController();
      setPost(null);
      setBusy(true);
      setError("");
      void (async () => {
        try {
          if (!isNotificationId(id)) return;
          // Read the actual source through RLS again, never trust a notification snapshot.
          const table = place ? "place_posts" : "posts";
          const result = await client()
            .from(table)
            .select(`*,profiles!${table}_author_id_fkey(${profileColumns})`)
            .eq("id", id)
            .abortSignal(ctl.signal)
            .maybeSingle();
          if (result.error) throw result.error;
          requireOwner(owner);
          if (!ctl.signal.aborted)
            setPost(result.data as unknown as Post | Place | null);
        } catch (e) {
          if (!ctl.signal.aborted) setError(socialError(e));
        } finally {
          if (!ctl.signal.aborted) setBusy(false);
        }
      })();
      return () => ctl.abort();
    }, [owner, id, place]),
  );
  return (
    <Page title="Innlegg" fallback="/notifications">
      <View style={{ padding: 20, gap: 16 }}>
        {busy ? (
          <Txt muted>Henter innlegget …</Txt>
        ) : error ? (
          <>
            <Txt accessibilityRole="alert">{error}</Txt>
            <Button
              secondary
              title="Prøv igjen"
              onPress={retry}
            />
          </>
        ) : post ? (
          place ? (
            <PlacePost
              post={post as Place}
              userId={owner}
              onRemoved={() => setPost(null)}
            />
          ) : (
            <CloudPost
              post={post as Post}
              userId={owner}
              initialComments={comments}
              onRemoved={() => setPost(null)}
            />
          )
        ) : (
          <Txt muted>Innlegget er slettet eller ikke lenger delt med deg.</Txt>
        )}
      </View>
    </Page>
  );
}
