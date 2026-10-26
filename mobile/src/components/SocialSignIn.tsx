import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { appleSignInAvailable } from "../features/auth/apple";
import {
  socialConfig,
  googleNeedsOwnBuild,
  type SocialProvider,
  visibleSocialProviders,
} from "../features/auth/socialConfig";
import { AppleSignInButton } from "./AppleSignInButton";
import { Txt } from "./ui";

export function SocialSignIn({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: (provider: SocialProvider) => void;
}) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    if (socialConfig.apple)
      void appleSignInAvailable()
        .then((value) => {
          if (active) setAvailable(value);
        })
        .catch(() => {
          if (active) setAvailable(false);
        });
    return () => {
      active = false;
    };
  }, []);
  const providers = visibleSocialProviders(available);
  if (!providers.google && !providers.apple)
    return googleNeedsOwnBuild ? (
      <Txt muted size={13}>
        Google-innlogging og registrering fungerer i nettleseren og i VYROs egen
        installasjon. Expo Go støtter ikke denne innloggingen. Her kan du bruke
        e-post.
      </Txt>
    ) : null;
  return (
    <View style={{ gap: 12 }}>
      {providers.apple && (
        <AppleSignInButton
          disabled={disabled}
          onPress={() => onPress("apple")}
        />
      )}
      {providers.google && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fortsett med Google"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onPress("google")}
          style={{
            minHeight: 54,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: "#747775",
            borderRadius: 12,
            backgroundColor: "#fff",
            opacity: disabled ? 0.5 : 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <Svg width={20} height={20} viewBox="0 0 48 48" aria-hidden>
            <Path
              fill="#4285F4"
              d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.8 6.08-14.82Z"
            />
            <Path
              fill="#34A853"
              d="M24 44c5.51 0 10.13-1.83 13.51-4.95l-6.61-5.14c-1.83 1.23-4.17 1.97-6.9 1.97-5.32 0-9.83-3.59-11.45-8.42H5.73v5.3A20 20 0 0 0 24 44Z"
            />
            <Path
              fill="#FBBC05"
              d="M12.55 27.46a12 12 0 0 1 0-6.92v-5.3H5.73a20 20 0 0 0 0 17.52l6.82-5.3Z"
            />
            <Path
              fill="#EA4335"
              d="M24 12.12c3 0 5.67 1.03 7.8 3.05l5.85-5.85C34.1 6.01 29.51 4 24 4A20 20 0 0 0 5.73 15.24l6.82 5.3C14.17 15.71 18.68 12.12 24 12.12Z"
            />
          </Svg>
          <Text style={{ color: "#1F1F1F", fontSize: 17, fontWeight: "600" }}>
            Fortsett med Google
          </Text>
        </Pressable>
      )}
      <Txt muted size={13} style={{ textAlign: "center" }}>
        Ny i VYRO? Kontoen opprettes når du fortsetter. Har du konto fra før,
        blir du logget inn. Du trenger ikke et eget VYRO-passord.
      </Txt>
      <Txt muted size={13} style={{ textAlign: "center", marginVertical: 4 }}>
        eller bruk e-post
      </Txt>
    </View>
  );
}
