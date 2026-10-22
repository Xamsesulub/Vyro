import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Icon, Txt } from "./ui";
import { palettes } from "../theme/tokens";

// Only the labelled header owns the drag. Scrolling details and panning the map
// keep their own gestures; camera padding changes once at the end of a drag.
export function MapRouteSheet({
  children,
  maxHeight,
  onHeightChange,
}: PropsWithChildren<{
  maxHeight: number;
  onHeightChange: (height: number) => void;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(true);
  const [handleHeight, setHandleHeight] = useState(56);
  const [contentHeight, setContentHeight] = useState(260);
  const fullHeight = Math.max(
    handleHeight,
    Math.min(maxHeight, handleHeight + contentHeight),
  );
  const travel = Math.max(1, fullHeight - handleHeight);
  const progress = useSharedValue(1);
  const start = useRef(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const latest = useRef({ collapsed, travel });
  useEffect(() => {
    latest.current = { collapsed, travel };
  }, [collapsed, travel]);
  const snap = useCallback(
    (close: boolean) => {
      clearTimeout(hideTimer.current);
      setCollapsed(close);
      if (!close) setBodyVisible(true);
      progress.set(
        withTiming(close ? 0 : 1, {
          duration: 200,
          reduceMotion: ReduceMotion.System,
        }),
      );
      // Remove hidden actions from keyboard focus as well as accessibility trees.
      if (close)
        hideTimer.current = setTimeout(() => setBodyVisible(false), 210);
    },
    [progress],
  );
  const pan = useMemo(
    () =>
      // PanResponder stores these callbacks; refs are read only during gestures.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dy) > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          clearTimeout(hideTimer.current);
          cancelAnimation(progress);
          start.current = progress.get();
          setBodyVisible(true);
        },
        onPanResponderMove: (_, gesture) =>
          progress.set(
            Math.max(
              0,
              Math.min(1, start.current - gesture.dy / latest.current.travel),
            ),
          ),
        onPanResponderRelease: (_, gesture) => {
          const close =
            Math.abs(gesture.vy) > 0.45
              ? gesture.vy > 0
              : start.current - gesture.dy / latest.current.travel < 0.5;
          snap(close);
        },
        onPanResponderTerminate: () => snap(latest.current.collapsed),
        onPanResponderTerminationRequest: () => false,
      }),
    [progress, snap],
  );
  useEffect(() => {
    onHeightChange(collapsed ? handleHeight : fullHeight);
  }, [collapsed, handleHeight, fullHeight, onHeightChange]);
  useEffect(
    () => () => {
      clearTimeout(hideTimer.current);
      cancelAnimation(progress);
    },
    [progress],
  );
  const style = useAnimatedStyle(() => ({
    height: handleHeight + (fullHeight - handleHeight) * progress.get(),
  }));
  return (
    <Animated.View style={[s.sheet, style]} testID="map-route-sheet">
      <View
        {...pan.panHandlers}
        style={
          Platform.OS === "web"
            ? ({ touchAction: "none" } as ViewStyle)
            : undefined
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            collapsed ? "Vis rutedetaljer" : "Minimer rutepanelet"
          }
          accessibilityHint="Dra håndtaket opp eller ned, eller trykk for å åpne og lukke."
          accessibilityState={{ expanded: !collapsed }}
          onPress={() => snap(!collapsed)}
          onLayout={(event) => setHandleHeight(event.nativeEvent.layout.height)}
          style={s.handle}
        >
          <View style={s.grip} />
          <View style={s.label}>
            <Txt
              size={12}
              weight="600"
              style={{ color: palettes.light.muted, flexShrink: 1 }}
            >
              {collapsed ? "Vis ruten · dra opp" : "Dra ned for å se kartet"}
            </Txt>
            <Icon
              name={collapsed ? "chevronUp" : "chevronDown"}
              size={18}
              color={palettes.light.muted}
            />
          </View>
        </Pressable>
      </View>
      {bodyVisible && (
        <ScrollView
          accessibilityElementsHidden={collapsed}
          importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
          pointerEvents={collapsed ? "none" : "auto"}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_, height) => {
            if (height > 0) setContentHeight(height);
          }}
          style={{
            height: fullHeight - handleHeight,
            flexGrow: 0,
            flexShrink: 0,
          }}
        >
          {children}
        </ScrollView>
      )}
    </Animated.View>
  );
}
const s = StyleSheet.create({
  sheet: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 24px #11182C22",
  },
  handle: {
    minHeight: 56,
    paddingTop: 9,
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  grip: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#AAB2A5" },
  label: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
