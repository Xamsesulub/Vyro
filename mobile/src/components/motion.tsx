import { PropsWithChildren, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import runnerMark from "../theme/runnerMark.json";
import { brand } from "../theme/tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const config = {
  duration: 320,
  easing: ease,
  reduceMotion: ReduceMotion.System,
};

/** Small, finite entrances. Never wrap the active recording screen or a map. */
export function Reveal({
  children,
  delay = 0,
}: PropsWithChildren<{ delay?: number }>) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    progress.set(reduced ? 1 : withDelay(delay, withTiming(1, config)));
    return () => cancelAnimation(progress);
  }, [delay, progress, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A graphic signature, deliberately not presented as a GPS map. */
export function MovementLine({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion();
  const draw = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    draw.set(withTiming(1, { ...config, duration: 850 }));
    return () => cancelAnimation(draw);
  }, [draw]);
  const props = useAnimatedProps(() => ({
    strokeDashoffset: 640 * (1 - draw.value),
  }));
  const path =
    "M-20 171C37 171 52 40 118 40C176 40 139 171 208 171C252 171 247 76 303 76L352 76";
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: compact ? 140 : 196,
        overflow: "hidden",
        borderRadius: 4,
        backgroundColor: "#F1F5ED",
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 210"
        preserveAspectRatio="xMidYMid slice"
      >
        <Path d={path} stroke="#DDE6D6" strokeWidth={56} fill="none" />
        <Path d={path} stroke="#F1F5ED" strokeWidth={51} fill="none" />
        <Path d={path} stroke="#DDE6D6" strokeWidth={29} fill="none" />
        <Path d={path} stroke="#F1F5ED" strokeWidth={25} fill="none" />
        <AnimatedPath
          d={path}
          animatedProps={props}
          stroke={brand.navy}
          strokeWidth={7}
          strokeDasharray="640 640"
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={118} cy={40} r={13} fill={brand.lavender} />
        <Circle cx={208} cy={171} r={13} fill={brand.coral} />
        <Circle cx={303} cy={76} r={18} fill={brand.lime} />
        <Path
          d="m298 76 4 4 7-8"
          stroke={brand.navy}
          strokeWidth={2}
          fill="none"
        />
      </Svg>
    </View>
  );
}

/** One short cold-start signature; never delays navigation or covers a resumed workout. */
export function LaunchSignature({
  ready,
  idle,
}: {
  ready: boolean;
  idle: boolean;
}) {
  const reduced = useReducedMotion();
  const [finished, setFinished] = useState(false);
  const opacity = useSharedValue(1);
  const draw = useSharedValue(0);
  useEffect(() => {
    if (!ready) return;
    if (reduced || !idle) {
      const skip = setTimeout(() => setFinished(true), 0);
      return () => clearTimeout(skip);
    }
    draw.set(withTiming(1, { ...config, duration: 420 }));
    opacity.set(withDelay(460, withTiming(0, { ...config, duration: 180 })));
    const timer = setTimeout(() => setFinished(true), 660);
    return () => {
      clearTimeout(timer);
      cancelAnimation(draw);
      cancelAnimation(opacity);
    };
  }, [ready, idle, reduced, draw, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const stroke = useAnimatedProps(() => ({
    strokeDashoffset: 30 * (1 - draw.value),
  }));
  if (!ready || !idle || reduced || finished) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 100,
          backgroundColor: brand.navy,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        },
        style,
      ]}
    >
      <Svg width={90} height={90} viewBox={runnerMark.viewBox}>
        <AnimatedPath
          d={runnerMark.path}
          stroke={brand.lime}
          strokeWidth={runnerMark.strokeWidth}
          strokeDasharray="30 30"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          animatedProps={stroke}
        />
      </Svg>
      <Text
        style={{
          color: "#FFFFFF",
          fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
          fontSize: 36,
          fontWeight: "800",
          letterSpacing: -1.5,
        }}
      >
        VYRO
      </Text>
      <Text
        style={{
          color: "#BDC6D8",
          fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
          fontSize: 10,
          letterSpacing: 3,
        }}
      >
        MOVE BEYOND
      </Text>
    </Animated.View>
  );
}

export function SelectionMotion({
  selected,
  background,
  children,
}: PropsWithChildren<{ selected: boolean; background: string }>) {
  const value = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    value.set(withTiming(selected ? 1 : 0, { ...config, duration: 180 }));
  }, [selected, value]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: selected ? background : "transparent",
    transform: [{ scale: 1 + value.value * 0.06 }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: 45,
          height: 30,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function FinishStamp() {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(1, { ...config, duration: 420 }));
    return () => cancelAnimation(progress);
  }, [progress]);
  const props = useAnimatedProps(() => ({
    strokeDashoffset: 38 * (1 - progress.value),
  }));
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={62} height={62} viewBox="0 0 62 62">
        <Circle cx={31} cy={31} r={30} fill={brand.lime} />
        <AnimatedPath
          d="m19 31 8 8 16-18"
          stroke={brand.navy}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="38 38"
          animatedProps={props}
        />
      </Svg>
    </View>
  );
}

export function ProgressLine({
  value,
  color,
  background,
}: {
  value: number;
  color: string;
  background: string;
}) {
  const reduced = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const progress = useSharedValue(reduced ? clamped : 0);
  useEffect(() => {
    progress.set(withTiming(clamped, { ...config, duration: 500 }));
    return () => cancelAnimation(progress);
  }, [clamped, progress]);
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Ukentlig distansemål"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height: 7,
        backgroundColor: background,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[{ height: 7, backgroundColor: color, borderRadius: 4 }, style]}
      />
    </View>
  );
}
