import { Switch } from "react-native";
import {
  ChoiceRow,
  Page,
  SettingsGroup,
  SettingsRow,
} from "../../components/SettingsUi";
import { useAppStore } from "../../stores/useAppStore";
export default function FeedSettings() {
  const feed = useAppStore((s) => s.homeFeed ?? "following");
  const examples = useAppStore((s) => s.examplesVisible);
  const preferences = useAppStore((s) => s.preferences);
  return (
    <Page title="Hjem og innhold">
      <SettingsGroup
        title="Startvisning på Hjem"
        note="Innlegg vises med de nyeste først. Øktene dine forblir private til du deler dem."
      >
        <ChoiceRow
          title="Følger"
          description="Innlegg fra deg og personene du følger."
          selected={feed === "following"}
          onPress={() => preferences({ homeFeed: "following" })}
        />
        <ChoiceRow
          title="Delt på nytt"
          description="Innlegg du har delt videre."
          selected={feed === "reposted"}
          onPress={() => preferences({ homeFeed: "reposted" })}
        />
        <ChoiceRow
          title="Mine økter"
          description="Dine private GPS-økter på denne enheten."
          selected={feed === "own"}
          onPress={() => preferences({ homeFeed: "own" })}
        />
      </SettingsGroup>
      <SettingsGroup
        title="Eksempler"
        note="Eksempler og simuleringer teller aldri i treningsstatistikken din."
      >
        <SettingsRow
          title="Vis eksempeløkter"
          description="Eksempelruter i kartet og egen visning i treningsloggen."
          end={
            <Switch
              accessibilityLabel="Vis eksempeløkter"
              value={examples}
              onValueChange={(examplesVisible) =>
                preferences({ examplesVisible })
              }
            />
          }
        />
      </SettingsGroup>
    </Page>
  );
}
