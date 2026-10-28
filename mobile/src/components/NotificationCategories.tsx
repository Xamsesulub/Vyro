import { useCallback, useRef, useState } from "react";
import { Switch, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { PageNote, SettingsGroup, SettingsRow } from "./SettingsUi";
import { Button, Txt } from "./ui";
import { socialError } from "../features/social/api";
import {
  loadNotificationPreferences,
  saveNotificationPreference,
  notificationCategories,
  type NotificationCategory,
  type NotificationPreferences,
  type Channels,
} from "../features/social/notificationPreferences";

export function NotificationCategories({ owner }: { owner: string }) {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const data = await loadNotificationPreferences(owner);
      if (current === generation.current) setPreferences(data);
    } catch (e) {
      if (current === generation.current) setError(socialError(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, [owner]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  async function change(
    category: NotificationCategory,
    channel: keyof Channels,
    value: boolean,
  ) {
    if (!preferences || lock.current || busy) return;
    lock.current = true;
    const current = generation.current;
    const next = { ...preferences[category], [channel]: value };
    setBusy(true);
    setError("");
    try {
      await saveNotificationPreference(owner, category, next);
      if (current === generation.current)
        setPreferences((old) => old && { ...old, [category]: next });
    } catch (e) {
      if (current === generation.current) setError(socialError(e));
    } finally {
      lock.current = false;
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <>
      <PageNote>
        Velg hvilke nye varsler du vil ha. Valgene gjelder kontoen din på alle
        enheter. Telefonvarsler krever også at varsler er slått på på telefonen.
      </PageNote>
      {preferences
        ? notificationCategories.map(({ key, title, description }) => (
            <SettingsGroup key={key} title={title} note={description}>
              {(
                [
                  ["in_app", "I appen"],
                  ["push", "På telefonen"],
                ] as const
              ).map(([channel, label]) => (
                <SettingsRow
                  key={channel}
                  title={label}
                  end={
                    <Switch
                      accessibilityLabel={`${title}: ${label.toLowerCase()}`}
                      value={preferences[key][channel]}
                      disabled={busy}
                      onValueChange={(value) =>
                        void change(key, channel, value)
                      }
                    />
                  }
                />
              ))}
            </SettingsGroup>
          ))
        : !error && <PageNote>Henter varselvalg …</PageNote>}
      {!!error && (
        <View style={{ padding: 22, gap: 12 }}>
          <Txt accessibilityRole="alert">{error}</Txt>
          <Button
            secondary
            title="Hent varselvalg på nytt"
            disabled={busy}
            onPress={() => void load()}
          />
        </View>
      )}
    </>
  );
}
