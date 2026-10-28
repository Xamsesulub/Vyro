import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { Page, SettingsGroup } from "../components/SettingsUi";
import ProfilePhotoEditor from "../components/ProfilePhotoEditor";
import { Button, Chip, Txt, useTheme } from "../components/ui";
import { useAuthStore } from "../stores/useAuthStore";
import { useOwnProfile } from "../features/auth/useOwnProfile";
import { loadOwnProfile } from "../stores/useProfileStore";
import {
  profileDetails,
  saveProfileDetails,
  validateProfileDetails,
} from "../features/auth/profileDetails";
import SportPicker from "../components/SportPicker";
import { sports } from "../features/activities/model";

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.session?.user);
  const { profile, failed } = useOwnProfile();
  return (
    <AccountGate>
      {user &&
        (profile ? (
          <ProfileForm key={user.id} user={user} />
        ) : (
          <Page title="Rediger profil" fallback="/profile">
            <View style={{ padding: 22, gap: 14 }}>
              <Txt>
                {failed ? "Kunne ikke hente profilen din." : "Henter profil …"}
              </Txt>
              {failed && (
                <Button
                  title="Prøv igjen"
                  onPress={() =>
                    void loadOwnProfile(
                      user.id,
                      new AbortController().signal,
                      true,
                    )
                  }
                />
              )}
            </View>
          </Page>
        ))}
    </AccountGate>
  );
}
function ProfileForm({ user }: { user: User }) {
  const { profile } = useOwnProfile();
  const [draft, setDraft] = useState(() =>
    profileDetails(user, profile?.display_name),
  );
  const [selectSports, setSelectSports] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const c = useTheme();
  async function save() {
    if (lock.current) return;
    const validation = validateProfileDetails(draft);
    if (validation) {
      setError(validation);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await saveProfileDetails(user.id, draft);
      if (!mounted.current) return;
      if (router.canGoBack()) router.back();
      else router.replace("/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke lagre profilen.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const field = (
    key: "displayName" | "lastName" | "bio" | "city",
    label: string,
    max: number,
    multiline = false,
  ) => (
    <View
      style={{
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderColor: c.border,
        gap: 7,
      }}
    >
      <Txt muted size={13}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={c.muted}
        editable={!busy}
        value={draft[key]}
        maxLength={max}
        multiline={multiline}
        autoCapitalize={key === "bio" ? "sentences" : "words"}
        onChangeText={(value) => setDraft({ ...draft, [key]: value })}
        style={{
          color: c.text,
          fontSize: 17,
          minHeight: multiline ? 76 : 30,
          textAlignVertical: "top",
          padding: 0,
        }}
      />
    </View>
  );
  return (
    <Page
      title="Rediger profil"
      fallback="/profile"
      backDisabled={busy}
      right={
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          accessibilityState={{ disabled: busy }}
          onPress={() => void save()}
          style={{
            minHeight: 48,
            minWidth: 60,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt weight="700" style={{ color: c.accent }}>
            {busy ? "Lagrer …" : "Lagre"}
          </Txt>
        </Pressable>
      }
    >
      <ProfilePhotoEditor owner={user.id} name={draft.displayName || "V"}/>
      {!!error && (
        <View
          accessibilityLiveRegion="polite"
          style={{ padding: 22, paddingBottom: 0 }}
        >
          <Txt>{error}</Txt>
        </View>
      )}
      <SettingsGroup
        title="Synlig for andre"
        note="Dette navnet vises på profilen, innleggene og kommentarene dine."
      >
        {field("displayName", "Visningsnavn", 50)}
      </SettingsGroup>
      <SettingsGroup
        title="Om deg · privat"
        note="Disse feltene er valgfrie og vises bare til deg. Etternavnet legges ikke til det offentlige profilnavnet."
      >
        {field("lastName", "Etternavn (valgfritt)", 50)}
        {field("bio", "Biografi (valgfritt)", 280, true)}
        {field("city", "Sted (valgfritt)", 80)}
      </SettingsGroup>
      <SettingsGroup title="Dine idretter" note="Velg én, flere eller alle.">
        <View
          style={{
            padding: 22,
            gap: 12,
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          <Chip
            title="Alle"
            selected={draft.selectedSports.length === sports.length}
            onPress={() => {
              if (!busy) setDraft({ ...draft, selectedSports: [...sports] });
            }}
          />
          <Button
            title={`Velg idretter (${draft.selectedSports.length})`}
            secondary
            disabled={busy}
            onPress={() => setSelectSports(true)}
          />
          <Txt muted size={13}>
            {draft.selectedSports.join(" · ") || "Ingen valgt"}
          </Txt>
        </View>
      </SettingsGroup>
      {selectSports && (
        <SportPicker
          multiple
          selected={draft.selectedSports}
          onSelect={(sport) =>
            setDraft((d) => ({
              ...d,
              selectedSports: d.selectedSports.includes(sport)
                ? d.selectedSports.filter((s) => s !== sport)
                : [...d.selectedSports, sport],
            }))
          }
          onClose={() => setSelectSports(false)}
        />
      )}
      <View style={{ padding: 22 }}>
        <Button
          title={busy ? "Lagrer profil …" : "Lagre profil"}
          disabled={busy}
          onPress={() => void save()}
        />
      </View>
    </Page>
  );
}
