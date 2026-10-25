import { PropsWithChildren, useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../stores/useAuthStore";
import { AuthLoading } from "./AuthLoading";
import { Welcome } from "./Welcome";

export function AccountGate({ children }: PropsWithChildren) {
  const { ready, session } = useAuthStore();
  useEffect(() => {
    if (ready && !session) router.prefetch("/account");
  }, [ready, session]);
  // A slow session recovery must never flash the signed-out welcome screen.
  if (!ready && !session) return <AuthLoading />;
  if (!session) return <Welcome />;
  return children;
}
