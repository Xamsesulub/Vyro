import { PropsWithChildren } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../stores/useAuthStore";
import { Button, Screen, Txt } from "./ui";

export function AccountGate({ children }: PropsWithChildren) {
  const { ready, session } = useAuthStore();
  if (!ready)
    return (
      <Screen>
        <Txt>Laster konto …</Txt>
      </Screen>
    );
  if (!session)
    return (
      <Screen>
        <Txt size={28} weight="700">
          Løp sammen
        </Txt>
        <Txt muted>
          Logg inn for å følge løpere og dele øktene dine med kart, distanse og
          tid.
        </Txt>
        <Button
          title="Logg inn eller opprett konto"
          onPress={() => router.push("/account")}
        />
        <Button
          title="Registrer aktivitet"
          secondary
          onPress={() => router.push("/track")}
        />
      </Screen>
    );
  return children;
}
