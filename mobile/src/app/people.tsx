import { router } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { PeopleSearch } from "../components/PeopleSearch";
import { Button, Screen, Txt } from "../components/ui";
import { useAuthStore } from "../stores/useAuthStore";
export default function People() {
  const id = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>
      {id && (
        <Screen>
          <Button
            title="Tilbake"
            secondary
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/profile")
            }
          />
          <Txt size={28} weight="800">
            Finn venner
          </Txt>
          <Txt muted size={14}>
            Søk etter personer og følg dem for å se turene og stedene de deler.
          </Txt>
          <PeopleSearch key={id} userId={id} />
        </Screen>
      )}
    </AccountGate>
  );
}
