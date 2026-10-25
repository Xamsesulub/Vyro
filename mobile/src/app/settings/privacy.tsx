import { router } from "expo-router";
import {
  ChoiceRow,
  Page,
  PageNote,
  SettingsGroup,
  SettingsRow,
} from "../../components/SettingsUi";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAppStore } from "../../stores/useAppStore";
export default function PrivacySettings() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const audience = useAppStore((s) =>
    userId ? (s.sharingAudienceByOwner?.[userId] ?? "followers") : "followers",
  );
  function choose(value: "followers" | "everyone") {
    if (!userId || useAuthStore.getState().session?.user.id !== userId) return;
    const store = useAppStore.getState();
    store.preferences({
      sharingAudienceByOwner: {
        ...store.sharingAudienceByOwner,
        [userId]: value,
      },
    });
  }
  return (
    <Page title="Personvern og deling">
      <PageNote>
        Du velger hva du deler. Nye økter er alltid private. Ingen innstilling
        her publiserer øktene dine automatisk.
      </PageNote>
      <SettingsGroup
        title="Når du velger å dele"
        note="Dette er et forvalg for nye innlegg på denne enheten. Du bekrefter publikum før publisering. Gamle innlegg endres ikke."
      >
        {userId ? (
          <>
            <ChoiceRow
              title="Følgere"
              description="Personene som følger deg i VYRO."
              selected={audience === "followers"}
              onPress={() => choose("followers")}
            />
            <ChoiceRow
              title="Alle innloggede"
              description="Andre VYRO-brukere kan se innlegget."
              selected={audience === "everyone"}
              onPress={() => choose("everyone")}
            />
          </>
        ) : (
          <SettingsRow
            title="Logg inn for å velge publikum"
            onPress={() => router.push("/account")}
          />
        )}
      </SettingsGroup>
      <SettingsGroup title="Beskyttelse av ruten">
        <SettingsRow
          title="Skjerm start og slutt"
          value="500 meter"
          description="Punkter nær start og slutt fjernes fra kartet du deler. Kontroller alltid forhåndsvisningen før publisering."
          icon="lock"
        />
        <SettingsRow
          title="Kart på låseskjermen"
          description="Velg om siste kartutsnitt og økttall skal være synlige på låst iPhone."
          onPress={() => router.push("/training-settings")}
        />
      </SettingsGroup>
      <SettingsGroup title="Kontoinformasjon">
        <SettingsRow
          title="Profil og etternavn"
          description="Visningsnavn og brukernavn er synlige for andre. Etternavn og øvrige profildetaljer er private."
          onPress={() => router.push("/edit-profile")}
        />
        <SettingsRow
          title="Privat sikkerhetskopi"
          description="Administrer lagring og gjenoppretting av øktene dine."
          onPress={() => router.push("/settings/data")}
        />
      </SettingsGroup>
    </Page>
  );
}
