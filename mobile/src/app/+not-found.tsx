import { router } from "expo-router";
import { Button, Screen, Txt } from "../components/ui";

export default function NotFound() {
  return (
    <Screen>
      <Txt size={28} weight="700">
        Siden finnes ikke
      </Txt>
      <Txt muted>Lenken kan være gammel eller ufullstendig.</Txt>
      <Button title="Tilbake til VYRO" onPress={() => router.replace("/")} />
    </Screen>
  );
}
