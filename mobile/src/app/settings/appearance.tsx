import { ChoiceRow, Page, SettingsGroup } from "../../components/SettingsUi";
import { useAppStore } from "../../stores/useAppStore";
export default function AppearanceSettings() {
  const theme = useAppStore((s) => s.theme);
  const preferences = useAppStore((s) => s.preferences);
  return (
    <Page title="Utseende">
      <SettingsGroup
        title="Velg utseende"
        note="Valget lagres på denne enheten og gjelder hele appen. Kartet har egne farger for god lesbarhet."
      >
        {(
          [
            [
              "system",
              "Følg telefonen",
              "Bytt automatisk med telefonens lyse og mørke modus.",
            ],
            ["light", "Lyst", "Lys bakgrunn og mørk tekst."],
            ["dark", "Mørkt", "Dempet bakgrunn for rolige kveldsturer."],
          ] as const
        ).map(([value, title, description]) => (
          <ChoiceRow
            key={value}
            title={title}
            description={description}
            selected={theme === value}
            onPress={() => preferences({ theme: value })}
          />
        ))}
      </SettingsGroup>
    </Page>
  );
}
