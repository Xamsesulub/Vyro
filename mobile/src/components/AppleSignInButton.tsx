import { Pressable, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

export type AppleSignInButtonProps = {
  disabled: boolean;
  onPress: () => void;
};

export function AppleSignInButton({
  disabled,
  onPress,
}: AppleSignInButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Fortsett med Apple"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 54,
        borderRadius: 12,
        backgroundColor: "#000",
        opacity: disabled ? 0.5 : 1,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={22} height={24} viewBox="0 0 24 24" aria-hidden>
        <Path
          fill="#fff"
          d="M17.05 12.54c.03 3.15 2.76 4.2 2.79 4.21-.02.07-.44 1.5-1.44 2.97-.87 1.27-1.77 2.54-3.2 2.57-1.4.03-1.85-.83-3.45-.83-1.59 0-2.09.8-3.42.86-1.38.05-2.43-1.38-3.31-2.65-1.8-2.6-3.18-7.35-1.33-10.56.92-1.6 2.57-2.61 4.36-2.64 1.36-.03 2.65.92 3.48.92.83 0 2.39-1.14 4.03-.97.69.03 2.61.28 3.84 2.08-.1.06-2.29 1.33-2.26 4.04ZM14.42 4.7c.73-.88 1.23-2.1 1.1-3.32-1.05.04-2.33.7-3.08 1.58-.68.78-1.28 2.03-1.12 3.23 1.17.09 2.37-.6 3.1-1.49Z"
        />
      </Svg>
      <Text style={{ fontSize: 17, fontWeight: "600", color: "#fff" }}>
        Fortsett med Apple
      </Text>
    </Pressable>
  );
}
