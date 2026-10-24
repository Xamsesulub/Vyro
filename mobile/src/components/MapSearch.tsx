import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { searchPlaces, type Place } from "../features/maps/search";
import { brand, palettes } from "../theme/tokens";
import { Icon } from "./ui";

export function MapSearch({
  active,
  onActiveChange,
  savedOnly,
  onToggleSaved,
  onSelect,
}: {
  active: boolean;
  onActiveChange: (active: boolean) => void;
  savedOnly: boolean;
  onToggleSaved: () => void;
  onSelect: (place: Place) => void;
}) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const request = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  function resetSearch() {
    request.current?.abort();
    request.current = null;
    setSearching(false);
    setResults([]);
    setError("");
  }

  useEffect(() => {
    if (!active) {
      input.current?.blur();
      request.current?.abort();
      request.current = null;
    }
    return () => request.current?.abort();
  }, [active]);

  function close() {
    resetSearch();
    input.current?.blur();
    Keyboard.dismiss();
    onActiveChange(false);
  }

  async function search() {
    if (!query.trim() || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setSearching(true);
    setResults([]);
    setError("");
    try {
      const places = await searchPlaces(query.trim(), controller.signal);
      if (controller.signal.aborted) return;
      setResults(places);
      if (!places.length)
        setError("Ingen steder funnet. Prøv med gatenavn og sted.");
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Søket feilet. Prøv igjen.");
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setSearching(false);
      }
    }
  }

  return (
    <>
      <View style={s.heading}>
        {!active && (
          <View style={s.brand}>
            <Icon name="run" color={palettes.light.text} size={32} />
          </View>
        )}
        <TextInput
          ref={input}
          accessibilityLabel="Søk etter sted"
          placeholder="Søk etter sted"
          placeholderTextColor={palettes.light.muted}
          value={query}
          onFocus={() => {
            resetSearch();
            onActiveChange(true);
          }}
          onChangeText={(value) => {
            resetSearch();
            setQuery(value);
          }}
          onSubmitEditing={() => void search()}
          returnKeyType="search"
          submitBehavior="submit"
          clearButtonMode="while-editing"
          autoCorrect={false}
          maxLength={200}
          style={s.input}
        />
        {active ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Søk"
              accessibilityState={{
                disabled: searching || !query.trim(),
                busy: searching,
              }}
              disabled={searching || !query.trim()}
              onPress={() => void search()}
              style={[
                s.action,
                s.search,
                (!query.trim() || searching) && { opacity: 0.5 },
              ]}
            >
              {searching ? (
                <ActivityIndicator color={palettes.light.text} />
              ) : (
                <Icon name="search" size={20} color={palettes.light.text} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Avbryt søk"
              onPress={close}
              style={s.action}
            >
              <Text style={s.actionText}>Avbryt</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vis lagrede ruter"
            accessibilityState={{ selected: savedOnly }}
            onPress={onToggleSaved}
            style={s.action}
          >
            <Text style={[s.actionText, savedOnly && { color: brand.route }]}>
              ☆ Lagret
            </Text>
          </Pressable>
        )}
      </View>
      {active && (
        <ScrollView
          style={s.results}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          accessibilityLabel="Stedssøkresultater"
        >
          {results.length ? (
            results.map((place) => (
              <Pressable
                key={place.id}
                accessibilityRole="button"
                accessibilityLabel={`Vis ${place.name} på kartet`}
                onPress={() => {
                  setQuery(place.name);
                  close();
                  onSelect(place);
                }}
                style={s.result}
              >
                <Icon name="locate" size={20} color={brand.route} />
                <Text style={[s.text, { flex: 1 }]}>{place.name}</Text>
                <Icon name="arrow" size={18} color={palettes.light.muted} />
              </Pressable>
            ))
          ) : (
            <Text accessibilityLiveRegion="polite" style={[s.text, s.hint]}>
              {searching
                ? "Søker …"
                : error || "Skriv en adresse eller et sted, og trykk Søk."}
            </Text>
          )}
        </ScrollView>
      )}
    </>
  );
}

const s = StyleSheet.create({
  heading: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 3px 16px #11182C18",
  },
  brand: { padding: 8, backgroundColor: "#EFF5E9", borderRadius: 12 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    fontSize: 16,
    color: palettes.light.text,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { fontSize: 13, fontWeight: "600", color: palettes.light.text },
  search: { backgroundColor: "#B2FF78", borderRadius: 12 },
  results: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: "white",
    boxShadow: "0 3px 16px #11182C18",
  },
  result: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#EEF0EC",
  },
  text: { fontSize: 16, lineHeight: 22, color: palettes.light.text },
  hint: { paddingVertical: 16, color: palettes.light.muted },
});
