import { Share } from "react-native";
import type { Profile } from "./api";
export async function shareProfile(
  profile: Profile,
): Promise<"shared" | "copied" | "cancelled"> {
  const result = await Share.share({
    title: "Min VYRO-profil",
    message: `Finn meg på VYRO: ${profile.display_name} (@${profile.username}). Åpne Finn venner i VYRO og søk etter @${profile.username}.`,
  });
  return result.action === Share.dismissedAction ? "cancelled" : "shared";
}
