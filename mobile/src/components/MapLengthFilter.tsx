import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./ui";
import { brand, palettes } from "../theme/tokens";

const choices = ["Alle lengder", "Under 3 km", "3–10 km", "Over 10 km"];

export function MapLengthFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const menuWidth = Math.min(220, width - 32);
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", () =>
      setPosition(null),
    );
    return () => subscription.remove();
  }, []);
  useFocusEffect(useCallback(() => () => setPosition(null), []));

  function open() {
    anchor.current?.measureInWindow((x, y, buttonWidth, buttonHeight) => {
      setPosition({
        left: Math.max(
          16,
          Math.min(x + buttonWidth - menuWidth, width - menuWidth - 16),
        ),
        top: Math.max(
          insets.top + 8,
          Math.min(y + buttonHeight + 8, height - insets.bottom - 232),
        ),
      });
    });
  }

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrer på lengde"
          accessibilityValue={{ text: choices[value] }}
          accessibilityState={{ expanded: position !== null }}
          onPress={open}
          style={styles.chip}
        >
          <Text style={styles.chipText}>
            {value === 0 ? "Lengde" : choices[value]}
          </Text>
          <Icon name="chevronDown" size={15} color={palettes.light.text} />
        </Pressable>
      </View>
      <Modal
        visible={position !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPosition(null)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lukk lengdevalg"
            onPress={() => setPosition(null)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityRole="menu"
            accessibilityLabel="Lengde på ruten"
            style={[styles.menu, position, { width: menuWidth }]}
          >
            {choices.map((label, index) => (
              <Pressable
                key={label}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: value === index }}
                onPress={() => {
                  onChange(index);
                  setPosition(null);
                }}
                style={[styles.option, value === index && styles.selected]}
              >
                <Text style={styles.optionText}>{label}</Text>
                {value === index && (
                  <Icon name="check" size={18} color={brand.route} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "white",
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipText: { color: palettes.light.text, fontSize: 13, fontWeight: "600" },
  overlay: { flex: 1 },
  menu: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: palettes.light.border,
    boxShadow: "0 8px 28px rgba(17, 24, 44, 0.18)",
  },
  option: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    gap: 8,
  },
  selected: { backgroundColor: "#EFF5E9" },
  optionText: { color: palettes.light.text, fontSize: 15, fontWeight: "600" },
});
