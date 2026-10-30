import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { client, type Comment, socialError } from "../features/social/api";
import { requireOwner } from "../features/social/profiles";
import { Avatar } from "./SocialUi";
import SafetyActions from "./SafetyActions";
import { Button, Icon, Txt, useTheme } from "./ui";

/** Separate from the feed so the composer always sits above the keyboard/tab bar. */
export default function PostComments({
  postId,
  userId,
  draft,
  onDraftChange,
  onClose,
}: {
  postId: string;
  userId: string;
  draft: string;
  onDraftChange: (text: string) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [keyboard, setKeyboard] = useState(false);
  const [inputHeight, setInputHeight] = useState(46);
  const [revision, setRevision] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const scrollToLatest = useRef(true);
  const request = useRef<AbortController | null>(null);

  const read = useCallback(
    async (signal: AbortSignal) => {
      requireOwner(userId);
      const result = await client()
        .from("comments")
        .select(
          "id,author_id,body,profiles!comments_author_id_fkey(id,username,display_name)",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(100)
        .abortSignal(signal);
      if (result.error) throw result.error;
      requireOwner(userId);
      if (alive.current && !signal.aborted)
        setComments((result.data as unknown as Comment[]).reverse());
    },
    [postId, userId],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboard(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 15000);
    let active = true;
    void read(ctl.signal)
      .catch(() => {
        if (active) setLoadError("Kunne ikke hente kommentarene. Prøv igjen.");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      ctl.abort();
    };
  }, [read, revision]);

  function refresh() {
    setLoading(true);
    setLoadError("");
    setRevision((n) => n + 1);
  }

  async function mutate(commentId?: string) {
    if (lock.current || (!commentId && !draft.trim())) return;
    lock.current = true;
    setWriting(true);
    setError("");
    const ctl = new AbortController();
    request.current = ctl;
    const timeout = setTimeout(() => ctl.abort(), 15000);
    try {
      requireOwner(userId);
      const result = commentId
        ? await client()
            .from("comments")
            .delete()
            .eq("id", commentId)
            .eq("post_id", postId)
            .eq("author_id", userId)
            .abortSignal(ctl.signal)
        : await client()
            .from("comments")
            .insert({ author_id: userId, post_id: postId, body: draft.trim() })
            .abortSignal(ctl.signal);
      if (result.error) throw result.error;
      requireOwner(userId);
      if (!alive.current || ctl.signal.aborted) return;
      if (commentId) {
        setComments((items) => items.filter((item) => item.id !== commentId));
        setConfirmDelete(null);
      } else {
        onDraftChange("");
        scrollToLatest.current = true;
        // A failed refresh must not encourage sending an already accepted comment again.
        refresh();
      }
    } catch (e) {
      if (alive.current) setError(socialError(e));
    } finally {
      clearTimeout(timeout);
      request.current = null;
      lock.current = false;
      if (alive.current) setWriting(false);
    }
  }
  function close() {
    if (lock.current) return;
    Keyboard.dismiss();
    onClose();
  }
  return (
    <Modal
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          accessibilityLabel="Lukk kommentarer"
          accessibilityRole="button"
          disabled={writing}
          onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: "#00000066" }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            flex: 1,
            marginTop: Math.max(insets.top + 16, 60),
            maxHeight: "86%",
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
            marginBottom: 0,
            backgroundColor: c.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.border,
              marginTop: 10,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              minHeight: 54,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}
          >
            <Txt size={20} weight="700" style={{ flex: 1 }}>
              Kommentarer
            </Txt>
            <Pressable
              accessibilityLabel="Ferdig med kommentarer"
              accessibilityRole="button"
              disabled={writing}
              onPress={close}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="close" color={c.text} size={22} />
            </Pressable>
          </View>
          <ScrollView
            ref={list}
            style={{ flex: 1, minHeight: 0 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            contentContainerStyle={{ padding: 20, gap: 22, flexGrow: 1 }}
            onContentSizeChange={() => {
              if (scrollToLatest.current && comments.length) {
                list.current?.scrollToEnd({ animated: false });
                scrollToLatest.current = false;
              }
            }}
          >
            {loadError ? (
              <View style={{ gap: 8 }}>
                <Txt accessibilityRole="alert">{loadError}</Txt>
                <Button
                  title="Prøv igjen"
                  secondary
                  disabled={loading}
                  onPress={refresh}
                />
              </View>
            ) : undefined}
            {!comments.length && loading ? (
              <ActivityIndicator
                accessibilityLabel="Henter kommentarer"
                color={c.accent}
              />
            ) : !comments.length && !loadError ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icon name="message" color={c.muted} size={30} />
                <Txt weight="700">Ingen kommentarer ennå</Txt>
                <Txt muted>Vær den første til å skrive noe.</Txt>
              </View>
            ) : undefined}
            {comments.map((item) => (
              <View key={item.id} style={{ flexDirection: "row", gap: 12 }}>
                <Avatar name={item.profiles.display_name} size={34} />
                <View style={{ flex: 1, gap: 5 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Txt size={14} weight="700">
                      {item.profiles.display_name}
                    </Txt>
                    <SafetyActions
                      owner={userId}
                      target={item.author_id}
                      name={item.profiles.display_name}
                      onBlocked={() => {
                        setComments((items) =>
                          items.filter(
                            (row) => row.author_id !== item.author_id,
                          ),
                        );
                        refresh();
                      }}
                    />
                  </View>
                  <Txt size={15}>{item.body}</Txt>
                  {item.author_id === userId && (
                    <View style={{ flexDirection: "row", gap: 20 }}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={writing}
                        accessibilityLabel={
                          confirmDelete === item.id
                            ? "Bekreft sletting"
                            : "Slett din kommentar"
                        }
                        onPress={() =>
                          confirmDelete === item.id
                            ? void mutate(item.id)
                            : setConfirmDelete(item.id)
                        }
                        style={{ minHeight: 36, justifyContent: "center" }}
                      >
                        <Txt muted size={12}>
                          {confirmDelete === item.id
                            ? "Bekreft sletting"
                            : "Slett"}
                        </Txt>
                      </Pressable>
                      {confirmDelete === item.id && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setConfirmDelete(null)}
                          disabled={writing}
                          style={{ minHeight: 36, justifyContent: "center" }}
                        >
                          <Txt muted size={12}>
                            Avbryt
                          </Txt>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
            {comments.length === 100 ? (
              <Txt muted size={12}>
                Viser de siste 100 kommentarene.
              </Txt>
            ) : undefined}
          </ScrollView>
          <View
            style={{
              borderTopWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: keyboard ? 10 : Math.max(insets.bottom, 12),
              gap: 8,
            }}
          >
            {!!error && (
              <Txt size={13} accessibilityRole="alert">
                {error}
              </Txt>
            )}
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}
            >
              <TextInput
                accessibilityLabel="Skriv kommentar"
                placeholder="Skriv en kommentar …"
                placeholderTextColor={c.muted}
                value={draft}
                onChangeText={onDraftChange}
                maxLength={500}
                multiline
                onContentSizeChange={(e) =>
                  setInputHeight(
                    Math.min(
                      112,
                      Math.max(46, e.nativeEvent.contentSize.height),
                    ),
                  )
                }
                editable={!writing}
                style={{
                  flex: 1,
                  height: draft ? inputHeight : 46,
                  minHeight: 46,
                  maxHeight: 112,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 12,
                  fontSize: 16,
                  lineHeight: 22,
                  borderRadius: 23,
                  backgroundColor: c.raised,
                  color: c.text,
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Publiser kommentar"
                accessibilityState={{
                  disabled: writing || !draft.trim(),
                  busy: writing,
                }}
                disabled={writing || !draft.trim()}
                onPress={() => void mutate()}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.accent,
                  opacity: writing || !draft.trim() ? 0.45 : 1,
                }}
              >
                {writing ? (
                  <ActivityIndicator color={c.onAccent} />
                ) : (
                  <View style={{ transform: [{ rotate: "-90deg" }] }}>
                    <Icon name="arrow" color={c.onAccent} size={22} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
