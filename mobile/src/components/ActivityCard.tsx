import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Workout } from "../features/activities/model";
import { Card, Icon, Txt, styles, useTheme } from "./ui";
import WorkoutStats from "./WorkoutStats";
import { sportInfo } from "../features/activities/sports";
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
              <Icon name={sportInfo(workout.sport).icon} color={c.text} />
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
        <WorkoutStats
          sport={workout.sport}
          seconds={workout.seconds}
          distance={workout.distance}
          timerOnly={workout.source === "timer"}
          maxSpeed={workout.maxSpeedKmh}
        />
        <Txt size={10} muted>
          {workout.source === "example"
            ? "EKSEMPELDATA"
            : workout.source === "gps"
              ? "GPS-ØKT"
              : workout.source === "timer"
                ? "TIDTAKING"
                : "SIMULERT ØKT"}{" "}
          · PRIVAT
        </Txt>
      </Card>
    </Pressable>
  );
}
