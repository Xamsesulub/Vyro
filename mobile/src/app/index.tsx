import { Redirect } from "expo-router";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
import { AuthLoading } from "../components/AuthLoading";
export default function Index() {
  const { session, ready } = useAuthStore();
  const onboarded = useAppStore((s) => s.onboarded);
  if (!ready && !session) return <AuthLoading />;
  return <Redirect href={session || onboarded ? "/(tabs)" : "/onboarding"} />;
}
