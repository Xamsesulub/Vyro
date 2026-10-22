import { Redirect, router } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { Button, Screen, Txt } from "../components/ui";
import { useAuthStore } from "../stores/useAuthStore";
import { useGpsStore } from "../stores/useGpsStore";
import { useAppStore } from "../stores/useAppStore";
import { initialRecording } from "../features/tracking/simulator";

// Recover drafts from the previous recorder without starting a second GPS watcher.
export default function RecordGps() {
  const { draft, ready, error } = useGpsStore();
  const userId = useAuthStore((s) => s.session?.user.id);
  const status = useAppStore((s) => s.recording.status);
  if (!ready)
    return (
      <Screen>
        <Txt>Laster økten …</Txt>
      </Screen>
    );
  if (error)
    return (
      <Screen>
        <Txt size={24}>Kunne ikke åpne det tidligere GPS-utkastet</Txt>
        <Txt>
          Utkastet er beholdt. Prøv igjen når enheten er låst opp og har ledig
          plass.
        </Txt>
        <Button
          title="Prøv gjenoppretting igjen"
          onPress={() => {
            void useGpsStore.persist.rehydrate();
          }}
        />
        <Button
          title="Til treningsskjermen"
          secondary
          onPress={() => router.replace("/(tabs)/track")}
        />
      </Screen>
    );
  if (!draft) return <Redirect href="/(tabs)/track" />;
  return (
    <AccountGate>
      <Screen>
        <Txt size={24}>Uferdig GPS-økt</Txt>
        <Txt>
          {draft.ownerId === userId
            ? "Du kan fortsette det tidligere opptaket i treningsskjermen."
            : "Logg inn med kontoen som startet denne økten for å fortsette."}
        </Txt>
        {draft.ownerId === userId && (
          <Button
            title="Fortsett økten"
            disabled={status !== "idle"}
            onPress={() => {
              useAppStore.setState({
                recording: {
                  ...initialRecording,
                  status: "paused",
                  ownerId: userId,
                  seconds: draft.seconds,
                  distance: draft.distance,
                  route: [
                    draft.points.map(({ latitude, longitude }) => ({
                      latitude,
                      longitude,
                    })),
                  ],
                },
              });
              // Retain the legacy draft until persistence has succeeded; recovery is idempotent.
              // Keep the legacy draft as a recovery backup.
              router.replace("/(tabs)/track");
            }}
          />
        )}
        <Button
          title="Til treningsskjermen"
          secondary
          onPress={() => router.replace("/(tabs)/track")}
        />
      </Screen>
    </AccountGate>
  );
}
