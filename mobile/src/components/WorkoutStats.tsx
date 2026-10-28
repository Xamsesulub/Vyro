import { View, useWindowDimensions } from "react-native";
import { Txt } from "./ui";
import { duration, km, pace, type Sport } from "../features/activities/model";
import { sportInfo } from "../features/activities/sports";
import { validMaxSpeed } from "../features/football/speed";

export default function WorkoutStats({
  sport,
  seconds,
  distance,
  timerOnly,
  maxSpeed,
}: {
  sport: Sport;
  seconds: number;
  distance: number;
  timerOnly: boolean;
  maxSpeed?: number;
}) {
  const speed = sportInfo(sport).metric === "speed";
  const { fontScale } = useWindowDimensions();
  const football = !timerOnly && sport === "Fotball";
  const metrics = [{ value: duration(seconds), label: "Aktiv tid" }];
  if (!timerOnly) {
    metrics.push({ value: km(distance), label: "Distanse · km" });
    metrics.push({
      value: football
        ? validMaxSpeed(maxSpeed)
          ? maxSpeed!.toLocaleString("nb-NO", { maximumFractionDigits: 1 })
          : "—"
        : distance >= 0.1
          ? speed
            ? ((distance / Math.max(1, seconds)) * 3600)
                .toFixed(1)
                .replace(".", ",")
            : pace(distance, seconds)
          : "—",
      label: football
        ? "Maksfart · km/t"
        : speed
          ? "Snitt · km/t"
          : "Snitt · min/km",
    });
  }
  // A whole metric may wrap to the next row, but its digits must never wrap.
  // The explanatory football text has its own row and cannot steal column width.
  const minWidth = Math.ceil(
    Math.max(100, ...metrics.map(({ value }) => value.length * 17)) *
      Math.max(1, fontScale),
  );
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        {metrics.map(({ value, label }) => (
          <View
            key={label}
            style={{
              flexGrow: 1,
              flexShrink: 0,
              flexBasis: minWidth,
              minWidth,
              gap: 4,
            }}
          >
            <Txt
              size={27}
              weight="700"
              numberOfLines={1}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {value}
            </Txt>
            <Txt muted size={12}>
              {label}
            </Txt>
          </View>
        ))}
      </View>
      {football && (
        <Txt muted size={12}>
          {validMaxSpeed(maxSpeed)
            ? "Maksfart er målt med GPS over fem sekunder."
            : "For få nøyaktige GPS-målinger til å vise maksfart."}
        </Txt>
      )}
    </View>
  );
}
