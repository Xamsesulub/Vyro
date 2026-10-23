import { PropsWithChildren, useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../stores/useAuthStore";
import { useAppStore } from "../stores/useAppStore";
import { Button, Screen, Txt, Logo, Icon, useTheme } from "./ui";
import { MovementLine, Reveal } from "./motion";
import { AuthLoading } from "./AuthLoading";

export function AccountGate({ children }: PropsWithChildren) {
  const { ready, session, confirmationEmail } = useAuthStore();
  const c = useTheme();
  const { width } = useWindowDimensions();
  useEffect(() => {
    if (ready && !session) router.prefetch("/account");
  }, [ready, session]);
  if (!ready && !session) return <AuthLoading />;
  if (!session)
    return (
      <Screen>
        {!!confirmationEmail && (
          <Txt muted>
            Du er ikke innlogget ennå. Bekreft e-posten for å bruke kontoen i
            hele VYRO.
          </Txt>
        )}
        <View
          style={{
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <Logo width={Math.min(width - 48, 380)} color={c.text} />
        </View>
        <Reveal>
          <View style={{ gap: 14, paddingTop: 12 }}>
            <Txt
              size={46}
              weight="800"
              style={{ letterSpacing: -2, lineHeight: 49 }}
            >
              Din tur.{"\n"}Ditt tempo.
            </Txt>
            <Txt muted style={{ maxWidth: 310 }}>
              Noen turer er best alene. Andre er fine å dele.
            </Txt>
          </View>
        </Reveal>
        <MovementLine />
        <Reveal delay={60}>
          <View style={{ gap: 16 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <Icon name="people" color={c.accent} size={21} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt weight="600">Dine folk. Deres turer.</Txt>
                <Txt muted size={13}>
                  Følg løpere og del økten med kart og tempo.
                </Txt>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <Icon name="lock" color={c.accent} size={21} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt weight="600">Du velger hva du deler.</Txt>
                <Txt muted size={13}>
                  Økten er privat til du publiserer den.
                </Txt>
              </View>
            </View>
          </View>
        </Reveal>
        <Button
          title={
            confirmationEmail
              ? "Bekreft e-post eller logg inn"
              : "Logg inn eller opprett konto"
          }
          icon="arrow"
          onPress={() => router.push("/account")}
        />
        <Button
          title="Utforsk kartet først"
          secondary
          icon="map"
          onPress={() => router.push("/map")}
        />
        <Button
          title="Prøv treningssimulering uten konto"
          secondary
          icon="play"
          onPress={() => {
            useAppStore.getState().mode("simulation");
            router.push("/track");
          }}
        />
      </Screen>
    );
  return children;
}
