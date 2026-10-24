import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  padding,
  opacity,
  privacySensitive,
  resizable,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";
import type { WorkoutActivityProps } from "./liveActivityModel";

function WorkoutActivity(
  props: WorkoutActivityProps,
  environment: LiveActivityEnvironment,
) {
  "widget";
  const stale = !!environment.isStale;
  const color =
    environment.colorScheme === "dark" || environment.isLuminanceReduced
      ? "#FFFFFF"
      : "#11182C";
  const metrics = (
    <HStack spacing={14} modifiers={[foregroundStyle(color)]}>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 12 })]}>Tid</Text>
        {props.paused || stale ? (
          <Text
            modifiers={[
              font({ size: 23, weight: "bold", design: "monospaced" }),
            ]}
          >
            {props.seconds}
          </Text>
        ) : (
          <Text
            date={new Date(props.timerStart)}
            dateStyle="timer"
            modifiers={[
              font({ size: 23, weight: "bold", design: "monospaced" }),
            ]}
          />
        )}
      </VStack>
      <Spacer />
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 12 })]}>Distanse · km</Text>
        <Text modifiers={[font({ size: 23, weight: "bold" })]}>
          {props.distance}
        </Text>
      </VStack>
      <Spacer />
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 12 })]}>Snitt /km</Text>
        <Text modifiers={[font({ size: 23, weight: "bold" })]}>
          {props.pace}
        </Text>
      </VStack>
    </HStack>
  );
  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[padding({ all: 14 }), foregroundStyle(color)]}
      >
        <HStack>
          <Text modifiers={[font({ size: 14, weight: "bold" })]}>
            VYRO · {props.sport}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 12 })]}>
            {props.paused ? "Pauset" : stale ? "Åpne økten" : "Økt pågår"}
          </Text>
        </HStack>
        {metrics}
        {props.mapUri ? (
          <Image
            uiImage={props.mapUri}
            modifiers={[
              resizable(),
              frame({ height: 112 }),
              opacity(environment.isLuminanceReduced ? 0.35 : 1),
              privacySensitive(),
            ]}
          />
        ) : (
          <Text modifiers={[font({ size: 12 })]}>Venter på kartutsnitt</Text>
        )}
        <Text modifiers={[font({ size: 11 })]}>
          {props.mapTime
            ? `Kart kl. ${props.mapTime} · Trykk for kart og pause`
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
    compactTrailing: <Text>{props.distance} km</Text>,
    minimal: (
      <Image
        systemName={props.paused ? "pause.fill" : "figure.run"}
        color="#B4FF72"
      />
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ all: 8 })]}>
        {metrics}
        <Text>Åpne kart og pause</Text>
      </VStack>
    ),
  };
}

export default createLiveActivity("VyroWorkout", WorkoutActivity);
