import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { IconButton } from "./SocialUi";
import { Icon, type IconName, Txt, useTheme } from "./ui";

export function Page({
  title,
  children,
  right,
  fallback = "/settings",
  plain = false,
  backDisabled = false,
}: PropsWithChildren<{
  title: string;
  right?: ReactNode;
  fallback?: Href;
  plain?: boolean;
  backDisabled?: boolean;
}>) {
  const c = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <View
        style={{
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderColor: c.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 12,
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
          }}
        >
          <IconButton
            name="back"
            label="Tilbake"
            variant="elevated"
            disabled={backDisabled}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace(fallback)
            }
          />
          <Txt
            size={20}
            weight="700"
            style={{ flex: 1, textAlign: "center" }}
            numberOfLines={2}
          >
            {title}
          </Txt>
          {right ?? <View style={{ width: 48 }} />}
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: plain ? c.bg : c.raised }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
            paddingBottom: 36,
          }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function SettingsGroup({
  title,
  children,
  note,
}: PropsWithChildren<{ title?: string; note?: string }>) {
  const c = useTheme();
  return (
    <View style={{ paddingTop: 22 }}>
      {!!title && (
        <View style={{ paddingHorizontal: 22, paddingBottom: 10 }}>
          <Txt size={12} weight="700" muted style={{ letterSpacing: 0.7 }}>
            {title.toLocaleUpperCase("nb-NO")}
          </Txt>
        </View>
      )}
      <View style={{ backgroundColor: c.surface }}>{children}</View>
      {!!note && (
        <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
          <Txt size={13} muted>
            {note}
          </Txt>
        </View>
      )}
    </View>
  );
}

export function SettingsRow({
  title,
  description,
  value,
  icon,
  onPress,
  end,
  danger = false,
  disabled = false,
  label,
}: {
  title: string;
  description?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  end?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const c = useTheme();
  const contents = (
    <>
      {icon && (
        <View style={{ width: 30, alignItems: "center" }}>
          <Icon
            name={icon}
            color={
              danger ? (c.bg === "#0B1120" ? "#FF8D79" : "#B33A28") : c.text
            }
            size={23}
          />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt
          size={16}
          weight="500"
          style={
            danger
              ? { color: c.bg === "#0B1120" ? "#FF8D79" : "#B33A28" }
              : undefined
          }
        >
          {title}
        </Txt>
        {!!description && (
          <Txt muted size={13}>
            {description}
          </Txt>
        )}
      </View>
      {!!value && (
        <Txt muted size={14} style={{ maxWidth: "42%", textAlign: "right" }}>
          {value}
        </Txt>
      )}
      {end ??
        (onPress && <Icon name="chevronRight" size={18} color={c.muted} />)}
    </>
  );
  const rowStyle = {
    minHeight: description ? 78 : 60,
    paddingHorizontal: 22,
    paddingVertical: 14,
    gap: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderBottomWidth: 0.5,
    borderColor: c.border,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle,
        {
          backgroundColor: pressed ? c.raised : c.surface,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {contents}
    </Pressable>
  ) : (
    <View style={rowStyle}>{contents}</View>
  );
}

export function ChoiceRow({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 22,
        paddingVertical: 18,
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        backgroundColor: pressed ? c.raised : c.surface,
        borderBottomWidth: 0.5,
        borderColor: c.border,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Txt weight={selected ? "700" : "400"}>{title}</Txt>
        {!!description && (
          <Txt muted size={13}>
            {description}
          </Txt>
        )}
      </View>
      <View style={{ width: 24 }}>
        {selected && <Icon name="check" color={c.accent} size={24} />}
      </View>
    </Pressable>
  );
}

export function PageNote({ children }: PropsWithChildren) {
  return (
    <View style={{ padding: 22, gap: 12 }}>
      <Txt muted size={14}>
        {children}
      </Txt>
    </View>
  );
}
