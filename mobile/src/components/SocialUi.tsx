import { TextInput, TextInputProps, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Icon, IconName, Txt, styles, useTheme } from "./ui";

export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? c.border : c.raised,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Icon name={name} color={c.text} size={23} />
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
  club = false,
}: {
  name: string;
  club?: boolean;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: club ? 14 : 23,
        backgroundColor: c.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {club ? (
        <Icon name="club" color={c.accent} />
      ) : (
        <Txt size={20} weight="700">
          {name.trim().slice(0, 1).toLocaleUpperCase("nb-NO")}
        </Txt>
      )}
    </View>
  );
}
