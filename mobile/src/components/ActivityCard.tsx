import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Workout, duration, km, pace } from "../features/activities/model";
import { Card, Icon, Metric, Txt, styles, useTheme } from "./ui";
export function ActivityCard({ workout }: { workout: Workout }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Åpne ${workout.title}`}
      onPress={() =>
        router.push({ pathname: "/activity/[id]", params: { id: workout.id } })
      }
    >
      <Card
        style={{
          padding: 0,
          paddingBottom: 24,
          borderBottomWidth: 1,
          borderRadius: 0,
        }}
      >
        <View style={styles.row}>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              flex: 1,
            }}
          >
            <View
              style={{
                padding: 12,
                borderRadius: 16,
                backgroundColor: c.raised,
              }}
            >
              <Icon
                name={
                  workout.sport === "Sykling"
                    ? "bike"
                    : workout.sport === "Fottur"
                      ? "mountain"
                      : "run"
                }
                color={c.text}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="600">{workout.title}</Txt>
              <Txt size={12} muted>
                {workout.sport} ·{" "}
                {new Date(workout.date).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })}
              </Txt>
            </View>
          </View>
          <Icon name="arrow" size={18} color={c.muted} />
        </View>
        <View style={styles.row}>
          <Metric value={km(workout.distance)} label="kilometer" />
          <Metric value={duration(workout.seconds)} label="minutter" />
          <Metric
            value={pace(workout.distance, workout.seconds)}
            label="min/km"
          />
        </View>
        <Txt size={10} muted>
          {workout.source === "example"
            ? "EKSEMPELDATA"
            : workout.source === "gps"
              ? "GPS-ØKT"
              : "SIMULERT ØKT"}{" "}
          · PRIVAT
        </Txt>
      </Card>
    </Pressable>
  );
}
