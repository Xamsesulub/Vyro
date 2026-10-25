import type { Profile } from "./api";
export function profileShareText(profile: Profile) {
  return `Finn meg på VYRO: ${profile.display_name} (@${profile.username}). Åpne Finn venner i VYRO og søk etter @${profile.username}.`;
}
export async function shareProfile(
  profile: Profile,
): Promise<"shared" | "copied" | "cancelled"> {
  const text = profileShareText(profile);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Min VYRO-profil", text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
      throw e;
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return "copied";
  }
  throw new Error(
    "Deling er ikke tilgjengelig her. Du kan dele brukernavnet ditt manuelt.",
  );
}
