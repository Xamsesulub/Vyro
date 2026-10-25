import * as AppleAuthentication from "expo-apple-authentication";
import { View } from "react-native";
import type { AppleSignInButtonProps } from "./AppleSignInButton";

export function AppleSignInButton({
  disabled,
  onPress,
}: AppleSignInButtonProps) {
  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={{ width: "100%", height: 54 }}
        accessibilityLabel="Fortsett med Apple"
        accessibilityState={{ disabled }}
        onPress={() => {
          if (!disabled) onPress();
        }}
      />
    </View>
  );
}
