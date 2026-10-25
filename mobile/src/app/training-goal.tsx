import { View } from "react-native";
import { router } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { GoalEditor } from "../components/GoalEditor";
import { Page, PageNote } from "../components/SettingsUi";
import { defaultGoal } from "../features/activities/training";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
export default function TrainingGoal() {
  const id = useAuthStore((s) => s.session?.user.id);
  const legacyGoal = useAppStore((s) => s.goal);
  const goals = useAppStore((s) => s.weeklyGoals);
  return (
    <AccountGate>
      {id && (
        <Page title="Treningsmål" fallback="/profile">
          <PageNote>
            Velg et mål som passer din uke. Bare dine egne GPS-økter teller.
          </PageNote>
          <View style={{ padding: 22 }}>
            <GoalEditor
              key={id}
              goal={
                goals?.[id] ?? {
                  ...defaultGoal,
                  target: legacyGoal || defaultGoal.target,
                }
              }
              close={() =>
                router.canGoBack() ? router.back() : router.replace("/profile")
              }
              save={(goal) => {
                if (useAuthStore.getState().session?.user.id !== id) return;
                const s = useAppStore.getState();
                s.preferences({
                  weeklyGoals: { ...s.weeklyGoals, [id]: goal },
                });
                if (router.canGoBack()) router.back();
                else router.replace("/profile");
              }}
            />
          </View>
        </Page>
      )}
    </AccountGate>
  );
}
