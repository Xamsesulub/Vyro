import React, { PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  type TextProps,
  View,
  ViewStyle,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { useAppStore } from "../stores/useAppStore";
import runnerMark from "../theme/runnerMark.json";
import { BrandMark, BrandWordmark } from "./Brand";
import { brand, palettes } from "../theme/tokens";

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const system = useColorScheme();
  return palettes[theme === "system" ? (system ?? "light") : theme];
}
export function Txt({
  children,
  size = 16,
  muted = false,
  weight = "400",
  style,
  numberOfLines,
  accessibilityRole,
  selectable,
}: PropsWithChildren<{
  size?: number;
  muted?: boolean;
  weight?: TextStyle["fontWeight"];
  style?: TextStyle;
  numberOfLines?: number;
  accessibilityRole?: TextProps["accessibilityRole"];
  selectable?: boolean;
}>) {
  const c = useTheme();
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      style={[
        {
          color: muted ? c.muted : c.text,
          fontSize: size,
          fontWeight: weight,
          lineHeight: size * 1.35,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
const paths = {
  ball: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8l4 3-2 5h-4l-2-5 4-3ZM12 8V3m4 8 5-2m-7 7 3 4m-7-4-3 4m1-9L3 9",
  strength: "M3 8v8m3-10v12m12-12v12m3-10v8M6 12h12",
  waves: "M2 7q3-4 6 0t6 0 6 0M2 12q3-4 6 0t6 0 6 0M2 17q3-4 6 0t6 0 6 0",
  refresh: "M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M18 18A8 8 0 0 1 4 12",
  more: "M4 6h16M4 12h16M4 18h16",
  chevronRight: "m9 5 7 7-7 7",
  close: "m6 6 12 12M18 6 6 18",
  share: "M12 15V3m-4 4 4-4 4 4M5 12v9h14v-9",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v6l4 2",
  bell: "M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3ZM10 20h4",
  device: "M8 2h8v4H8V2Zm0 16h8v4H8v-4ZM6 6h12v12H6V6Zm4 6 2 2 3-4",
  cloud: "M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11H6Z",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6m0-10v.1",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M16 16l5 5",
  plus: "M12 4v16M4 12h16",
  photo: "M3 4h18v16H3ZM3 16l5-5 5 5 3-3 5 5M16 8h.01",
  settings:
    "M9.59 5L10.09 2.18L13.91 2.18L14.41 5L16.85 6.42L19.55 5.44L21.46 8.74L19.26 10.59L19.26 13.41L21.46 15.26L19.55 18.56L16.85 17.58L14.41 19L13.91 21.82L10.09 21.82L9.59 19L7.15 17.58L4.45 18.56L2.54 15.26L4.74 13.41L4.74 10.59L2.54 8.74L4.45 5.44L7.15 6.42Z M15.3 12a3.3 3.3 0 1 1-6.6 0 3.3 3.3 0 0 1 6.6 0Z",
  message: "M4 4h16v12H9l-5 4V4Z",
  club: "M12 3 4 7v6c0 4 8 8 8 8s8-4 8-8V7l-8-4ZM8 12l3 3 5-6",
  chevronUp: "m6 15 6-6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  expand: "M14 3h7v7M21 3l-7 7M3 14v7h7M3 21l7-7",
  collapse: "M21 3l-7 7m0-7v7h7M3 21l7-7m-7 0h7v7",
  locate:
    "M12 2v3 M12 19v3 M2 12h3 M19 12h3 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  layers: "m12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5",
  map: "M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
  record:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10",
  home: "M3 10 12 3 21 10 M5 9v12h5v-7h4v7h5V9",
  track: "m4 20 6-16 4 10 6 6-16 0Z M10 4l4 10 6 6",
  chart: "M4 20V12m8 8V4m8 16V9",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8",
  user: "M20 21v-2a7 7 0 0 0-14 0v2M13 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "m15 5-7 7 7 7",
  check: "m5 12 4 4L19 6",
  play: "m8 4 12 8-12 8Z",
  pause: "M8 5v14m8-14v14",
  stop: "M6 6h12v12H6Z",
  // VYRO's own runner, also used by the wordmark and launcher assets.
  run: runnerMark.path,
  mountain: "m2 20 7-13 4 6 3-10 6 17H2Zm5-9 2 3 2-2",
  bike: "M5 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8m14 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 17l5-9 4 9H5m9 0 4-12h-4M8 8h4",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  lock: "M5 10h14v11H5Zm3 0V6a4 4 0 0 1 8 0v4",
  trophy:
    "M7 3h10v7a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 3v6m-4 0h8",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 24,
  color = brand.lime,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  if (name === "run") return <BrandMark size={size} color={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function Logo({
  small = false,
  color = runnerMark.navy,
  width,
}: {
  small?: boolean;
  color?: string;
  width?: number;
}) {
  return <BrandWordmark width={width ?? (small ? 160 : 280)} color={color} />;
}
export function Button({
  title,
  onPress,
  secondary = false,
  icon,
  disabled = false,
  danger = false,
  large = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
  danger?: boolean;
  large?: boolean;
}) {
  const c = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (large) return;
          scale.set(
            withTiming(0.97, {
              duration: 100,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        onPressOut={() => {
          scale.set(
            withSpring(1, {
              damping: 24,
              stiffness: 380,
              mass: 0.6,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        style={{
          minHeight: large ? 76 : 54,
          borderRadius: large ? 24 : 16,
          backgroundColor: danger
            ? brand.coral
            : secondary
              ? c.raised
              : brand.lime,
          opacity: disabled ? 0.4 : 1,
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: "row",
          gap: 12,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Txt
          size={large ? 22 : 16}
          weight="700"
          style={{ color: secondary ? c.text : brand.navy }}
        >
          {title}
        </Txt>
        {icon && (
          <Icon name={icon} color={secondary ? c.text : brand.navy} size={20} />
        )}
      </Pressable>
    </Animated.View>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  const c = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: 0,
          padding: 18,
          borderRadius: 14,
          gap: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Screen({
  children,
  footer,
}: PropsWithChildren<{ footer?: React.ReactNode }>) {
  const c = useTheme();
  const error = useAppStore((s) => s.storageError);
  return (
    <SafeAreaView
      edges={
        footer ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]
      }
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          gap: 24,
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          paddingBottom: 36,
        }}
      >
        {error && <Txt style={{ color: brand.coral }}>{error}</Txt>}
        {children}
      </ScrollView>
      {footer && (
        <View
          style={{
            backgroundColor: c.bg,
            borderTopWidth: 1,
            borderTopColor: c.border,
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 632,
              alignSelf: "center",
              gap: 10,
            }}
          >
            {footer}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
export function Header({
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 6 }}>
        <Txt size={26} weight="700" style={{ letterSpacing: -0.5 }}>
          {title}
        </Txt>
      </View>
      {right}
    </View>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <Txt size={20} weight="700">
        {title}
      </Txt>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Txt size={13} style={{ color: c.accent }}>
            {action}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}
export function Badge({ text }: { text: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: c.raised,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
      }}
    >
      <Txt size={10} weight="700" muted style={{ letterSpacing: 1 }}>
        {text.toUpperCase()}
      </Txt>
    </View>
  );
}
export function Metric({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Txt
        size={27}
        weight="700"
        style={{
          fontVariant: ["tabular-nums"],
          letterSpacing: -1,
          ...(color ? { color } : {}),
        }}
      >
        {value}
      </Txt>
      <Txt size={12} muted>
        {label}
      </Txt>
    </View>
  );
}
export function Ring({
  progress,
  size = 100,
}: {
  progress: number;
  size?: number;
}) {
  const c = useTheme();
  const radius = 40;
  const length = 2 * Math.PI * radius;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle
        cx={50}
        cy={50}
        r={radius}
        stroke={c.raised}
        strokeWidth={9}
        fill="none"
      />
      <Circle
        cx={50}
        cy={50}
        r={radius}
        stroke={brand.lime}
        strokeWidth={9}
        fill="none"
        strokeDasharray={`${length} ${length}`}
        strokeDashoffset={length * (1 - Math.max(0, Math.min(1, progress)))}
        strokeLinecap="round"
        rotation={-90}
        origin="50, 50"
      />
      <Path
        d="m37 51 9 9 18-20"
        stroke={brand.lime}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
export function Chip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: selected ? brand.lime : c.raised,
        borderRadius: 14,
      }}
    >
      <Txt
        size={13}
        weight="600"
        style={{ color: selected ? brand.navy : c.muted }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
