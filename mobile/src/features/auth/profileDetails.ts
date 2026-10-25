import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { acceptAuthSession, useAuthStore } from "../../stores/useAuthStore";
import { saveDisplayName, useProfileStore } from "../../stores/useProfileStore";
import { sports, type Sport } from "../activities/model";
import { authErrorMessage } from "./validation";

export type ProfileDetails = {
  displayName: string;
  lastName: string;
  bio: string;
  city: string;
  mainSport: Sport;
};
export function profileDetails(user: User, displayName = ""): ProfileDetails {
  const metadata = user.user_metadata ?? {};
  const text = (key: string) =>
    typeof metadata[key] === "string" ? metadata[key] : "";
  return {
    displayName: displayName || text("display_name"),
    lastName: text("last_name"),
    bio: text("bio"),
    city: text("city"),
    mainSport: sports.includes(metadata.main_sport)
      ? metadata.main_sport
      : "Løping",
  };
}
export function validateProfileDetails(draft: ProfileDetails) {
  if (!draft.displayName.trim() || draft.displayName.trim().length > 50)
    return "Visningsnavnet må ha mellom 1 og 50 tegn.";
  if (draft.lastName.trim().length > 50)
    return "Etternavnet kan ha maks 50 tegn.";
  if (draft.bio.trim().length > 280) return "Biografien kan ha maks 280 tegn.";
  if (draft.city.trim().length > 80) return "Stedet kan ha maks 80 tegn.";
  if (!sports.includes(draft.mainSport))
    return "Velg en av idrettene i listen.";
}
export async function saveProfileDetails(
  userId: string,
  draft: ProfileDetails,
) {
  const validation = validateProfileDetails(draft);
  if (validation) throw new Error(validation);
  const owns = () => useAuthStore.getState().session?.user.id === userId;
  if (!supabase || !owns())
    throw new Error("Logg inn på nytt for å redigere profilen.");
  const current = useProfileStore.getState().profile;
  let publicSaved = false;
  if (
    current?.id !== userId ||
    current.display_name !== draft.displayName.trim()
  ) {
    await saveDisplayName(userId, draft.displayName);
    publicSaved = true;
  }
  if (!owns()) throw new Error("Kontoen ble byttet. Åpne profilen på nytt.");
  let updatedUser: User;
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: draft.displayName.trim(),
        last_name: draft.lastName.trim() || null,
        bio: draft.bio.trim() || null,
        city: draft.city.trim() || null,
        main_sport: draft.mainSport,
      },
    });
    if (error) throw error;
    updatedUser = data.user;
  } catch (error) {
    throw new Error(
      publicSaved
        ? "Visningsnavnet er lagret, men de private profildetaljene ble ikke lagret. Prøv Lagre på nytt."
        : authErrorMessage(error),
    );
  }
  const session = useAuthStore.getState().session;
  if (!session || session.user.id !== userId || updatedUser.id !== userId)
    throw new Error("Kontoen ble byttet. Åpne profilen på nytt.");
  acceptAuthSession({ ...session, user: updatedUser });
}
