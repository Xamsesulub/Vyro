import { Redirect } from "expo-router";
import { Welcome } from "../components/Welcome";
import { AuthLoading } from "../components/AuthLoading";
import { useAuthStore } from "../stores/useAuthStore";
export default function Onboarding() {
  const { session, ready } = useAuthStore();
  if (!ready && !session) return <AuthLoading />;
  return session ? <Redirect href="/(tabs)" /> : <Welcome standalone />;
}
