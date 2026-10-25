import { ChoiceRow, Page, SettingsGroup } from "../../components/SettingsUi";
import { useAppStore } from "../../stores/useAppStore";
export default function MapSettings() {
  const selected = useAppStore((s) => s.defaultMapKind ?? "standard");
  return (
    <Page title="Standardkart">
      <SettingsGroup
        title="Kartlag"
        note="Valget brukes i Kart og under trening. Du kan også bytte kartlag direkte i kartet."
      >
        {(
          [
            ["standard", "Standard", "Tydelige veier, stier og stedsnavn."],
            [
              "satellite",
              "Satellitt",
              "Fly- og satellittbilder uten ekstra veietiketter.",
            ],
            ["hybrid", "Hybrid", "Satellittbilder med veier og stedsnavn."],
          ] as const
        ).map(([value, title, description]) => (
          <ChoiceRow
            key={value}
            title={title}
            description={description}
            selected={selected === value}
            onPress={() =>
              useAppStore.getState().preferences({ defaultMapKind: value })
            }
          />
        ))}
      </SettingsGroup>
    </Page>
  );
}
