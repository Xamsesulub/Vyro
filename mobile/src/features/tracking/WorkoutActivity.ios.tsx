import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  activityBackgroundTint,
  aspectRatio,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  opacity,
  privacySensitive,
  resizable,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";
import type { WorkoutActivityProps } from "./liveActivityModel";

export function WorkoutActivity(
  props: WorkoutActivityProps,
  environment: LiveActivityEnvironment,
) {
  "widget";
  const stale = !!environment.isStale;
  const number = [
    font({ size: 22, weight: "bold", design: "monospaced" }),
    lineLimit(1),
    minimumScaleFactor(0.7),
  ];
  const label = [
    font({ size: 10, weight: "medium" }),
    foregroundStyle("#BFCBDF"),
    lineLimit(1),
  ];
  const metrics = (
    <HStack spacing={12} modifiers={[foregroundStyle("#FFFFFF")]}>
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
      >
        <Text modifiers={label}>Tid</Text>
        {props.paused || stale ? (
          <Text modifiers={number}>{props.seconds}</Text>
        ) : (
          <Text
            date={new Date(props.timerStart)}
            dateStyle="timer"
            modifiers={number}
          />
        )}
      </VStack>
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
      >
        <Text modifiers={label}>Distanse · km</Text>
        <Text modifiers={number}>{props.distance}</Text>
      </VStack>
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
      >
        <Text modifiers={label}>Snitt /km</Text>
        <Text modifiers={number}>{props.pace}</Text>
      </VStack>
    </HStack>
  );
  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          padding({ all: 10 }),
          background("#11182C"),
          activityBackgroundTint("#11182C"),
          foregroundStyle("#FFFFFF"),
        ]}
      >
        <HStack spacing={8}>
          <Text
            modifiers={[
              font({ size: 12, weight: "bold" }),
              foregroundStyle("#B4FF72"),
              lineLimit(1),
            ]}
          >
            VYRO · {props.sport}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 11 }),
              foregroundStyle("#DCE5F3"),
              lineLimit(1),
            ]}
          >
            {props.paused ? "Pauset" : stale ? "Åpne økten" : "Økt pågår"}
          </Text>
        </HStack>
        {metrics}
        {props.mapUri ? (
          <Image
            uiImage={props.mapUri}
            modifiers={[
              resizable(),
              aspectRatio({ contentMode: "fit" }),
              frame({ height: 60 }),
              clipShape("roundedRectangle", 8),
              opacity(environment.isLuminanceReduced ? 0.35 : 1),
              privacySensitive(),
            ]}
          />
        ) : null}
        <Text
          modifiers={[
            font({ size: 10 }),
            foregroundStyle("#BFCBDF"),
            lineLimit(1),
          ]}
        >
          {props.mapTime
            ? "Kart kl. " + props.mapTime + " · Trykk for økten"
            : "Trykk for kart og pause"}
        </Text>
      </VStack>
    ),
    compactLeading: (
      <Image
        systemName={props.paused ? "pause.fill" : "figure.run"}
        color="#B4FF72"
      />
    ),
    compactTrailing: (
      <Text
        modifiers={[
          foregroundStyle("#FFFFFF"),
          font({ size: 12, weight: "semibold" }),
          lineLimit(1),
        ]}
      >
        {props.distance} km
      </Text>
    ),
    minimal: (
      <Image
        systemName={props.paused ? "pause.fill" : "figure.run"}
        color="#B4FF72"
      />
    ),
    expandedBottom: (
      <VStack
        spacing={6}
        modifiers={[padding({ all: 8 }), foregroundStyle("#FFFFFF")]}
      >
        {metrics}
        <Text modifiers={[font({ size: 11 }), foregroundStyle("#BFCBDF")]}>
          {props.paused
            ? "Pauset · Trykk for økten"
            : "Trykk for kart og pause"}
        </Text>
      </VStack>
    ),
  };
}
export default createLiveActivity("VyroWorkout", WorkoutActivity);
