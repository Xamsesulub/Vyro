import { Redirect } from "expo-router";
import { useAppStore } from "../stores/useAppStore";
export default function Index() {
  return (
    <Redirect
      href={useAppStore((s) => s.onboarded) ? "/(tabs)" : "/onboarding"}
    />
  );
}
