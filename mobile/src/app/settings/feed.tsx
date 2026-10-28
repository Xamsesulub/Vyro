import { ChoiceRow, Page, SettingsGroup } from "../../components/SettingsUi";
import { useAppStore } from "../../stores/useAppStore";
export default function FeedSettings() {
  const feed = useAppStore((s) => s.homeFeed ?? "following");
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
          description="Dine private økter på denne enheten."
          selected={feed === "own"}
          onPress={() => preferences({ homeFeed: "own" })}
        />
      </SettingsGroup>
    </Page>
  );
}
