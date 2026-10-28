import { TextInput, TextInputProps, Pressable, View, Image } from "react-native";
import { useAvatar } from "../features/social/avatar";
import { useState } from "react";
import { router } from "expo-router";
import { Icon, IconName, Txt, styles, useTheme } from "./ui";

export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
  variant = "subtle",
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "subtle" | "elevated";
}) {
  const c = useTheme();
  const elevated = variant === "elevated";
  const size = elevated ? 48 : 46;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? c.border : elevated ? c.surface : c.raised,
        boxShadow: elevated ? "0 4px 18px #11182C14" : undefined,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Icon name={name} color={c.text} size={elevated ? 25 : 23} />
    </Pressable>
  );
}
export function SocialHeader({
  title,
  back = false,
}: {
  title: string;
  back?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
      >
        {back && (
          <IconButton
            name="back"
            label="Tilbake"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/community")
            }
          />
        )}
        <Txt size={26} weight="800" style={{ flexShrink: 1 }}>
          {title}
        </Txt>
      </View>
      <IconButton
        name="search"
        label="Søk etter personer"
        onPress={() => router.push("/people")}
      />
    </View>
  );
}
export function Field(props: TextInputProps) {
  const c = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        {
          minHeight: 50,
          padding: 14,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          color: c.text,
          backgroundColor: c.surface,
          fontSize: 16,
        },
        props.style,
      ]}
    />
  );
}
export function Avatar({
  name,
  path,
  club = false,
  size = 46,
}: {
  name: string;
  path?: string | null;
  club?: boolean;
  size?: number;
}) {
  const c = useTheme();
  const uri = useAvatar(path);
  const [failedUri,setFailedUri]=useState<string|null>(null);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: club ? 14 : size / 2,
        backgroundColor: c.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri && uri!==failedUri && !club ? <Image source={{uri}} onError={()=>setFailedUri(uri)} accessibilityLabel={`Profilbilde: ${name}`} style={{width:size,height:size,borderRadius:size/2}}/> : club ? (
        <Icon name="club" color={c.accent} />
      ) : (
        <Txt size={size * 0.43} weight="700">
          {name.trim().slice(0, 1).toLocaleUpperCase("nb-NO")}
        </Txt>
      )}
    </View>
  );
}
