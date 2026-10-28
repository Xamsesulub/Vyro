import { useMemo, useState } from "react";
import { Modal, Pressable, SectionList, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, Txt, useTheme } from "./ui";
import { Sport, sportInfo, sportSections } from "../features/activities/sports";

/** Mount only while open so a new selection starts with an empty search. */
export default function SportPicker({
  selected,
  favorites = [],
  multiple = false,
  onSelect,
  onClose,
}: {
  selected: Sport[];
  favorites?: Sport[];
  multiple?: boolean;
  onSelect: (sport: Sport) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  const [query, setQuery] = useState("");
  const sections = useMemo(
    () => sportSections(query, favorites),
    [query, favorites],
  );
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.surface }}
        edges={["top", "bottom"]}
      >
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Txt size={22} weight="700">
            {multiple ? "Dine idretter" : "Velg en idrett"}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              multiple ? "Ferdig med idrettsvalg" : "Lukk idrettsvalg"
            }
            onPress={onClose}
            style={{
              minHeight: 48,
              minWidth: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {multiple ? (
              <Txt weight="700" style={{ color: c.accent }}>
                Ferdig
              </Txt>
            ) : (
              <Icon name="close" color={c.text} />
            )}
          </Pressable>
        </View>
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 12,
            paddingHorizontal: 14,
            borderRadius: 14,
            backgroundColor: c.raised,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon name="search" size={20} color={c.muted} />
          <TextInput
            accessibilityLabel="Søk etter idrett"
            placeholder="Søk etter idrett"
            placeholderTextColor={c.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            style={{ flex: 1, minHeight: 48, color: c.text, fontSize: 16 }}
            clearButtonMode="while-editing"
          />
        </View>
        <SectionList
          sections={sections}
          keyExtractor={(sport) => sport}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          stickySectionHeadersEnabled={false}
          extraData={selected}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          ListEmptyComponent={
            <Txt muted style={{ paddingVertical: 24 }}>
              Ingen idretter passer søket.
            </Txt>
          }
          renderSectionHeader={({ section }) => (
            <Txt
              weight="700"
              size={14}
              style={{ paddingTop: 20, paddingBottom: 8 }}
            >
              {section.title}
            </Txt>
          )}
          renderItem={({ item }) => {
            const chosen = selected.includes(item);
            return (
              <Pressable
                accessibilityRole={multiple ? "checkbox" : "radio"}
                accessibilityLabel={item}
                accessibilityState={{ checked: chosen }}
                onPress={() => {
                  onSelect(item);
                  if (!multiple) onClose();
                }}
                style={({ pressed }) => ({
                  minHeight: 62,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginVertical: 2,
                  borderRadius: 14,
                  backgroundColor: chosen ? c.raised : "transparent",
                  opacity: pressed ? 0.65 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                })}
              >
                <Icon
                  name={sportInfo(item).icon}
                  color={chosen ? c.accent : c.text}
                  size={24}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt weight={chosen ? "700" : "500"}>{item}</Txt>
                  <Txt muted size={12}>
                    {sportInfo(item).gps ? "Tid og GPS" : "Tid · uten GPS"}
                  </Txt>
                </View>
                {chosen && <Icon name="check" color={c.accent} size={22} />}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
