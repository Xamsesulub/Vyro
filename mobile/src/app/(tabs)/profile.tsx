import { useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityCard } from "../../components/ActivityCard";
import { Avatar, IconButton } from "../../components/SocialUi";
import { AuthLoading } from "../../components/AuthLoading";
import { Button, Icon, Txt, useTheme } from "../../components/ui";
import { SettingsGroup, SettingsRow } from "../../components/SettingsUi";
import { TrainingProgress } from "../../components/TrainingProgress";
import {
  initialHistoryFilter,
  TrainingHistoryFilters,
} from "../../components/TrainingHistoryFilters";
import { examples } from "../../features/activities/examples";
import { filterHistory, ownTraining } from "../../features/activities/training";
import { useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useOwnProfile } from "../../features/auth/useOwnProfile";
import { useConnectionCounts } from "../../features/social/connections";
import { shareProfile } from "../../features/social/shareProfile";
import { profileDetails } from "../../features/auth/profileDetails";

type ProfileTab = "progress" | "activities" | "more";
export default function Profile() {
  const { session, ready } = useAuthStore();
  if (!ready && !session) return <AuthLoading />;
  return (
    <ProfileContent key={session?.user.id ?? "guest"} user={session?.user} />
  );
}
function ProfileContent({ user }: { user?: User }) {
  const c = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: ProfileTab =
    params.tab === "activities"
      ? "activities"
      : params.tab === "more"
        ? "more"
        : user
          ? "progress"
          : "activities";
  const [filter, setFilter] = useState<typeof initialHistoryFilter>(() => ({
    ...initialHistoryFilter,
    source: user ? "gps" : "simulation",
  }));
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const workouts = useAppStore((s) => s.workouts);
  const examplesVisible = useAppStore((s) => s.examplesVisible);
  const localName = useAppStore((s) => s.name);
  const storageError = useAppStore((s) => s.storageError);
  const confirmation = useAuthStore((s) => s.confirmationEmail);
  const { profile } = useOwnProfile();
  const counts = useConnectionCounts(user?.id);
  const name =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    (user ? "Din profil" : localName || "Din profil");
  const details = user ? profileDetails(user, name) : null;
  const real = useMemo(
    () => ownTraining(workouts, user?.id),
    [workouts, user?.id],
  );
  const list = useMemo(
    () =>
      filterHistory(
        examplesVisible ? [...workouts, ...examples] : workouts,
        filter,
        user?.id,
      ),
    [workouts, examplesVisible, filter, user?.id],
  );
  function selectTab(value: ProfileTab) {
    router.setParams({ tab: value });
  }
  const outlineButton = {
    minHeight: 44,
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 10,
  };
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.surface }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingVertical: 10,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <IconButton
          name="plus"
          label="Start en ny økt"
          variant="elevated"
          onPress={() => router.push("/track")}
        />
        <Txt size={18} weight="700">
          Du
        </Txt>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <IconButton
            name="search"
            label="Finn venner"
            variant="elevated"
            onPress={() => router.push("/people")}
          />
          <IconButton
            name="settings"
            label="Innstillinger"
            variant="elevated"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>
      <FlatList
        data={tab === "activities" ? list : []}
        keyExtractor={(w) => w.id}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 32,
          backgroundColor: c.raised,
        }}
        ListHeaderComponent={
          <>
            <View
              style={{
                padding: 20,
                paddingTop: 8,
                gap: 18,
                backgroundColor: c.surface,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <Avatar name={name} size={72} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt size={24} weight="800">
                    {name}
                  </Txt>
                  <Txt muted size={14}>
                    {user
                      ? `${real.length} ${real.length === 1 ? "aktivitet" : "aktiviteter"}`
                      : confirmation
                        ? "Fullfør innlogging · ikke innlogget"
                        : "Gjest · ikke innlogget"}
                  </Txt>
                  {!!details?.city && (
                    <Txt muted size={12}>
                      {details.city}
                    </Txt>
                  )}
                </View>
              </View>
              {user && (
                <>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Se følgere"
                      onPress={() =>
                        router.push({
                          pathname: "/connections",
                          params: { tab: "followers" },
                        })
                      }
                      style={{ minHeight: 40, justifyContent: "center" }}
                    >
                      <Txt size={14}>
                        <Txt weight="700" size={14}>
                          {counts?.followers ?? "—"}
                        </Txt>{" "}
                        følgere
                      </Txt>
                    </Pressable>
                    <Txt muted size={14} style={{ alignSelf: "center" }}>
                      ·
                    </Txt>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Se hvem du følger"
                      onPress={() =>
                        router.push({
                          pathname: "/connections",
                          params: { tab: "following" },
                        })
                      }
                      style={{ minHeight: 40, justifyContent: "center" }}
                    >
                      <Txt size={14}>
                        <Txt weight="700" size={14}>
                          {counts?.following ?? "—"}
                        </Txt>{" "}
                        følger
                      </Txt>
                    </Pressable>
                  </View>
                  {!!details?.bio && (
                    <Txt muted size={14}>
                      {details.bio}
                    </Txt>
                  )}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push("/edit-profile")}
                      style={outlineButton}
                    >
                      <Txt size={14} weight="700">
                        Rediger profil
                      </Txt>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !profile || sharing }}
                      disabled={!profile || sharing}
                      onPress={async () => {
                        if (!profile || sharing) return;
                        setSharing(true);
                        setShareMessage("");
                        try {
                          const result = await shareProfile(profile);
                          if (result === "copied")
                            setShareMessage(
                              "Profilteksten er kopiert. Lim den inn der du vil dele den.",
                            );
                        } catch {
                          setShareMessage(
                            `Du finner meg på VYRO som @${profile.username}.`,
                          );
                        } finally {
                          setSharing(false);
                        }
                      }}
                      style={[
                        outlineButton,
                        { opacity: !profile || sharing ? 0.5 : 1 },
                      ]}
                    >
                      <Txt size={14} weight="700">
                        {sharing ? "Åpner …" : "Del profil"}
                      </Txt>
                    </Pressable>
                  </View>
                  {!!shareMessage && (
                    <Txt muted size={13}>
                      {shareMessage}
                    </Txt>
                  )}
                </>
              )}
              {!!storageError && <Txt>{storageError}</Txt>}
              {!user && (
                <>
                  <Txt muted>
                    Logg inn for å se din fremgang, finne venner og ta vare på
                    turene dine.
                  </Txt>
                  <Button
                    title="Logg inn"
                    onPress={() => router.push("/account")}
                  />
                </>
              )}
            </View>
            {
              <>
                <View
                  accessibilityRole="tablist"
                  style={{
                    flexDirection: "row",
                    backgroundColor: c.surface,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  {(
                    [
                      ["progress", "Fremgang", "chart"],
                      ["activities", "Aktiviteter", "run"],
                      ["more", "Mer", "more"],
                    ] as const
                  )
                    .filter(([value]) => !!user || value !== "progress")
                    .map(([value, label, icon]) => (
                      <Pressable
                        key={value}
                        accessibilityRole="tab"
                        accessibilityLabel={label}
                        accessibilityState={{ selected: tab === value }}
                        onPress={() => selectTab(value)}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          gap: 6,
                          paddingTop: 16,
                          paddingBottom: 14,
                          borderBottomWidth: 3,
                          borderColor: tab === value ? c.accent : "transparent",
                        }}
                      >
                        <Icon
                          name={icon}
                          color={tab === value ? c.accent : c.muted}
                          size={24}
                        />
                        <Txt
                          size={12}
                          weight={tab === value ? "700" : "500"}
                          style={{ color: tab === value ? c.text : c.muted }}
                        >
                          {label}
                        </Txt>
                      </Pressable>
                    ))}
                </View>
                {user && tab === "progress" && (
                  <TrainingProgress workouts={real} owner={user.id} />
                )}
                {tab === "activities" && (
                  <TrainingHistoryFilters
                    filter={filter}
                    change={setFilter}
                    count={list.length}
                    examples={examplesVisible}
                  />
                )}
                {tab === "more" && (
                  <>
                    <SettingsGroup title="Din trening">
                      <SettingsRow
                        title="Treningsmål"
                        icon="chart"
                        onPress={() => router.push("/training-goal")}
                      />
                      <SettingsRow
                        title="Soner"
                        icon="map"
                        onPress={() => router.push("/turf")}
                      />
                      <SettingsRow
                        title="Apple Watch"
                        icon="device"
                        onPress={() => router.push("/apple-watch")}
                      />
                    </SettingsGroup>
                    <SettingsGroup title="Konto">
                      <SettingsRow
                        title="Rediger profil"
                        icon="user"
                        onPress={() => router.push("/edit-profile")}
                      />
                      <SettingsRow
                        title="Data og sikkerhetskopi"
                        icon="cloud"
                        onPress={() => router.push("/settings/data")}
                      />
                      <SettingsRow
                        title="Innstillinger"
                        icon="settings"
                        onPress={() => router.push("/settings")}
                      />
                    </SettingsGroup>
                  </>
                )}
              </>
            }
          </>
        }
        renderItem={({ item, index }) => (
          <View
            style={{
              backgroundColor: c.surface,
              padding: 20,
              paddingBottom: 0,
              gap: 12,
            }}
          >
            {(!index ||
              item.date.slice(0, 7) !== list[index - 1].date.slice(0, 7)) && (
              <Txt muted size={13} weight="600">
                {new Date(item.date).toLocaleDateString("nb-NO", {
                  month: "long",
                  year: "numeric",
                })}
              </Txt>
            )}
            <ActivityCard workout={item} />
          </View>
        )}
        ListEmptyComponent={
          tab === "activities" ? (
            <View style={{ padding: 22, gap: 14 }}>
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
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
