import { useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useShallow } from "zustand/react/shallow";
import { ActivityCard } from "../../components/ActivityCard";
import { IconButton } from "../../components/SocialUi";
import { Button, Chip, Txt, styles, useTheme } from "../../components/ui";
import { GoalEditor } from "../../components/GoalEditor";
import { ProgressLine } from "../../components/motion";
import { examples } from "../../features/activities/examples";
import {
  km,
  sports,
  total,
  weekWorkouts,
} from "../../features/activities/model";
import {
  defaultGoal,
  filterHistory,
  goalProgress,
  goalUnit,
  HistoryFilter,
  milestones,
  ownTraining,
} from "../../features/activities/training";
import { useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useOwnProfile } from "../../features/auth/useOwnProfile";

export default function Profile() {
  const s = useAppStore(
    useShallow((s) => ({
      name: s.name,
      legacyGoal: s.goal,
      examplesVisible: s.examplesVisible,
      workouts: s.workouts,
      goals: s.weeklyGoals,
      preferences: s.preferences,
      storageError: s.storageError,
    })),
  );
  const { session, ready, confirmationEmail } = useAuthStore();
  const { profile } = useOwnProfile();
  const userId = session?.user.id;
  const displayName =
    profile?.display_name ||
    session?.user.user_metadata?.display_name ||
    s.name ||
    "Din profil";
  const c = useTheme();
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>({
    search: "",
    sport: "Alle",
    period: "all",
    source: "gps",
  });
  const goal = (userId && s.goals?.[userId]) || {
    ...defaultGoal,
    target: s.legacyGoal || defaultGoal.target,
  };
  const real = useMemo(
    () => ownTraining(s.workouts, userId),
    [s.workouts, userId],
  );
  const weekly = weekWorkouts(real);
  const stats = total(weekly);
  const progress = goalProgress(real, goal, userId);
  const records = useMemo(() => milestones(real, userId), [real, userId]);
  const list = useMemo(
    () =>
      filterHistory(
        s.examplesVisible ? [...s.workouts, ...examples] : s.workouts,
        filter,
        userId,
      ),
    [s.workouts, s.examplesVisible, filter, userId],
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <FlatList
        data={list}
        keyExtractor={(w) => w.id}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
          gap: 20,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
        }}
        ListHeaderComponent={
          <View style={{ gap: 22 }}>
            <View style={styles.row}>
              <Txt size={28} weight="700">
                Du
              </Txt>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <IconButton
                  name="search"
                  label="Finn venner"
                  onPress={() => router.push("/people")}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/settings")}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Txt size={14}>Innstillinger</Txt>
                </Pressable>
              </View>
            </View>
            <View style={{ gap: 4 }}>
              <Txt size={22} weight="700">
                {displayName}
              </Txt>
              <Txt muted size={13}>
                {!ready
                  ? "Laster konto …"
                  : session
                    ? "Innlogget"
                    : confirmationEmail
                      ? "Venter på e-postbekreftelse · ikke innlogget"
                      : "Gjest · ikke innlogget"}
              </Txt>
            </View>
            {!!s.storageError && <Txt>{s.storageError}</Txt>}
            {!session && (
              <Button
                title={
                  !ready
                    ? "Laster konto …"
                    : confirmationEmail
                      ? "Bekreft e-post"
                      : "Logg inn"
                }
                disabled={!ready}
                secondary
                onPress={() => router.push("/account")}
              />
            )}
            <Txt size={20} weight="700">
              Denne uken
            </Txt>
            <View style={styles.row}>
              {[
                [km(stats.distance), "km"],
                [String(Math.round(stats.seconds / 60)), "minutter"],
                [String(weekly.length), "økter"],
              ].map(([value, label]) => (
                <View key={label} style={{ gap: 4 }}>
                  <Txt size={27} weight="700">
                    {value}
                  </Txt>
                  <Txt muted size={12}>
                    {label}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt muted size={12}>
              Bare dine egne GPS-økter teller i fremgang og mål.
            </Txt>
            <View style={{ gap: 10 }}>
              <View style={styles.row}>
                <Txt weight="700">Ukentlig mål · {goal.sport}</Txt>
                {userId && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEditing(!editing)}
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Txt size={13}>Endre mål</Txt>
                  </Pressable>
                )}
              </View>
              <Txt>
                {progress.value.toLocaleString("nb-NO", {
                  maximumFractionDigits: 1,
                })}{" "}
                av {goal.target} {goalUnit(goal)}
              </Txt>
              <ProgressLine
                value={progress.fraction}
                color={c.accent}
                background={c.raised}
              />
              <Txt muted size={13}>
                {progress.remaining === 0
                  ? "Ukemålet er nådd!"
                  : `${progress.remaining.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} ${goalUnit(goal)} igjen denne uken`}
              </Txt>
              {editing && userId && (
                <GoalEditor
                  key={userId}
                  goal={goal}
                  close={() => setEditing(false)}
                  save={(next) => {
                    s.preferences({
                      weeklyGoals: {
                        ...useAppStore.getState().weeklyGoals,
                        [userId]: next,
                      },
                    });
                    setEditing(false);
                  }}
                />
              )}
            </View>
            {!!records.longest && (
              <View
                style={{
                  gap: 6,
                  borderTopWidth: 1,
                  borderColor: c.border,
                  paddingTop: 18,
                }}
              >
                <Txt weight="700">Dine milepæler</Txt>
                <Txt muted size={14}>
                  Lengste tur: {km(records.longest.distance)} km ·{" "}
                  {records.longest.sport}
                </Txt>
                <Txt muted size={14}>
                  Mest aktive uke: {records.bestWeek} økter
                </Txt>
              </View>
            )}
            <View
              style={[
                styles.row,
                { borderTopWidth: 1, borderColor: c.border, paddingTop: 18 },
              ]}
            >
              <Txt size={21} weight="700">
                Treningslogg
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: filtersOpen }}
                onPress={() => setFiltersOpen(!filtersOpen)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Txt size={14}>Filtrer</Txt>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Søk i treningsloggen"
              placeholder="Finn en tur etter navn"
              placeholderTextColor={c.muted}
              value={filter.search}
              onChangeText={(search) => setFilter({ ...filter, search })}
              style={{
                color: c.text,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
              }}
            />
            <View style={styles.wrap}>
              {(
                [
                  ["gps", "GPS-økter"],
                  ["simulation", "Simuleringer"],
                  ...(s.examplesVisible ? [["example", "Eksempler"]] : []),
                ] as [HistoryFilter["source"], string][]
              ).map(([source, label]) => (
                <Chip
                  key={source}
                  title={label}
                  selected={filter.source === source}
                  onPress={() => setFilter({ ...filter, source })}
                />
              ))}
            </View>
            {filtersOpen && (
              <>
                <View style={styles.wrap}>
                  {(["Alle", ...sports] as const).map((sport) => (
                    <Chip
                      key={sport}
                      title={sport}
                      selected={filter.sport === sport}
                      onPress={() => setFilter({ ...filter, sport })}
                    />
                  ))}
                </View>
                <View style={styles.wrap}>
                  {(
                    [
                      ["all", "Alle datoer"],
                      ["week", "Denne uken"],
                      ["month", "Denne måneden"],
                    ] as const
                  ).map(([period, label]) => (
                    <Chip
                      key={period}
                      title={label}
                      selected={filter.period === period}
                      onPress={() => setFilter({ ...filter, period })}
                    />
                  ))}
                </View>
                <Button
                  title="Nullstill filtre"
                  secondary
                  onPress={() =>
                    setFilter({
                      ...filter,
                      sport: "Alle",
                      period: "all",
                      search: "",
                    })
                  }
                />
              </>
            )}
            <Txt muted size={12}>
              {list.length} økter ·{" "}
              {filter.source === "gps"
                ? "privat treningshistorikk"
                : "teller ikke i mål eller milepæler"}
            </Txt>
          </View>
        }
        renderItem={({ item, index }) => {
          const month = (w: typeof item) =>
            new Date(w.date).toLocaleDateString("nb-NO", {
              month: "long",
              year: "numeric",
            });
          return (
            <View style={{ gap: 16 }}>
              {(!index || month(list[index - 1]) !== month(item)) && (
                <Txt weight="600">{month(item)}</Txt>
              )}
              <ActivityCard workout={item} />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ gap: 14 }}>
            <Txt muted>
              {filter.search ||
              filter.sport !== "Alle" ||
              filter.period !== "all"
                ? "Ingen økter passer filtrene. Prøv et annet søk."
                : filter.source === "gps"
                  ? "Din første tur starter her."
                  : "Ingen økter i denne kategorien."}
            </Txt>
            {filter.source === "gps" && (
              <Button
                title="Start en økt"
                onPress={() => router.push("/track")}
              />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
