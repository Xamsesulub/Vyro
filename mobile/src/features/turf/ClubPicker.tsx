import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadClubPage, type Club, type ClubPage } from "../clubs/api";
import { Icon, Txt, Button, useTheme } from "../../components/ui";
import { IconButton } from "../../components/SocialUi";
import { turfError } from "./api";

export function ClubPicker({
  selected,
  onSelect,
}: {
  selected: Club | null;
  onSelect: (club: Club) => void;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Velg klubb${selected ? `, ${selected.name}` : ""}`}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 76,
          borderRadius: 22,
          backgroundColor: c.surface,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 4px 18px #11182C12",
        }}
      >
        <View style={{ flex: 1 }}>
          <Txt size={20} weight="700" numberOfLines={1}>
            {selected?.name ?? "Velg klubb"}
          </Txt>
          <Txt size={13} muted>
            {selected
              ? `${selected.member_count ?? ""} ${selected.member_count === 1 ? "medlem" : "medlemmer"}`.trim()
              : "Konkurrer med klubben din"}
          </Txt>
        </View>
        <Icon name="chevronDown" color={c.text} size={22} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {open && (
          <ClubChoices
            selected={selected?.id}
            onClose={() => setOpen(false)}
            onSelect={(club) => {
              onSelect(club);
              setOpen(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}
function ClubChoices({
  selected,
  onSelect,
  onClose,
}: {
  selected?: string;
  onSelect: (c: Club) => void;
  onClose: () => void;
}) {
  const c = useTheme(),
    insets = useSafeAreaInsets();
  const [page, setPage] = useState<ClubPage>({ items: [], more: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useFocusEffect(
    useCallback(() => {
      void retry;
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      void loadClubPage("mine", undefined, abort.signal)
        .then((data) => {
          if (!abort.signal.aborted) setPage(data);
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(turfError(e));
        })
        .finally(() => {
          if (!abort.signal.aborted) setBusy(false);
        });
      return () => abort.abort();
    }, [retry]),
  );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#11182C66",
        justifyContent: "flex-end",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lukk klubbvelger"
        onPress={onClose}
        style={{ flex: 1 }}
      />
      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: 20,
          paddingBottom: Math.max(20, insets.bottom),
          maxHeight: "75%",
          gap: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Txt size={23} weight="700">
            Dine klubber
          </Txt>
          <IconButton name="close" label="Lukk" onPress={onClose} />
        </View>
        <FlatList
          data={page.items}
          keyExtractor={(club) => club.id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === selected }}
              onPress={() => onSelect(item)}
              style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: c.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Txt weight="700">{item.name}</Txt>
                <Txt size={13} muted>
                  {item.member_count}{" "}
                  {item.member_count === 1 ? "medlem" : "medlemmer"}
                </Txt>
              </View>
              {item.id === selected && <Icon name="check" color={c.accent} />}
            </Pressable>
          )}
        />
        {busy && <ActivityIndicator accessibilityLabel="Henter klubber" />}
        {!!error && (
          <>
            <Txt accessibilityRole="alert">{error}</Txt>
            <Button
              secondary
              title="Prøv igjen"
              onPress={() => {
                setError("");
                setRetry((n) => n + 1);
              }}
            />
          </>
        )}
        {page.more && (
          <Button
            title="Vis flere klubber"
            secondary
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              const abort = controller.current;
              if (!abort || abort.signal.aborted) return;
              try {
                const next = await loadClubPage(
                  "mine",
                  page.items.at(-1),
                  abort.signal,
                );
                if (!abort.signal.aborted)
                  setPage({
                    items: [...page.items, ...next.items],
                    more: next.more,
                  });
              } catch (e) {
                if (!abort.signal.aborted) setError(turfError(e));
              } finally {
                if (!abort.signal.aborted) setBusy(false);
              }
            }}
          />
        )}
        {!busy && !page.items.length && !error && (
          <Txt muted>Du er ikke med i en klubb ennå.</Txt>
        )}
        <Button
          title="Finn eller opprett klubb"
          secondary
          onPress={() => {
            onClose();
            router.push("/(tabs)/community");
          }}
        />
      </View>
    </View>
  );
}
