import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Button, Txt, useTheme } from "./ui";
import { client, socialError } from "../features/social/api";
import { requireOwner } from "../features/social/profiles";

const reasons = {
  harassment: "Trakassering",
  spam: "Spam",
  privacy: "Personvern",
  inappropriate: "Upassende innhold",
  other: "Annet",
};
export default function SafetyActions({
  owner,
  target,
  name,
  postId,
  placeId,
  onBlocked,
}: {
  owner: string;
  target: string;
  name: string;
  postId?: string;
  placeId?: string;
  onBlocked: () => void;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "block" | "sent">(
    "menu",
  );
  const [reason, setReason] = useState<keyof typeof reasons>("harassment");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (owner === target) return null;
  async function submit(block: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      requireOwner(owner);
      const result = block
        ? await client().rpc("vyro_block", { p_target: target, p_block: true })
        : await client().rpc("vyro_report", {
            p_target: target,
            p_reason: reason,
            p_details: details.trim(),
            p_post: postId ?? null,
            p_place: placeId ?? null,
          });
      if (result.error) throw result.error;
      requireOwner(owner);
      if (block) {
        setOpen(false);
        onBlocked();
      } else {
        setMode("sent");
        setDetails("");
      }
    } catch (e) {
      setError(socialError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Flere valg for ${name}`}
        onPress={() => {
          setMode("menu");
          setError("");
          setOpen(true);
        }}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Txt size={24}>···</Txt>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: c.bg }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingTop: 40, gap: 18 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Txt weight="700" size={22}>
                {mode === "report"
                  ? "Rapporter"
                  : mode === "block"
                    ? "Blokker bruker"
                    : name}
              </Txt>
              <Button
                title="Lukk"
                secondary
                disabled={busy}
                onPress={() => setOpen(false)}
              />
            </View>
            {mode === "menu" && (
              <>
                <Button
                  title="Rapporter"
                  secondary
                  onPress={() => setMode("report")}
                />
                <Button
                  title="Blokker bruker"
                  secondary
                  onPress={() => setMode("block")}
                />
              </>
            )}
            {mode === "report" && (
              <>
                <Txt muted>
                  Velg årsak. Rapporten er privat og sendes til VYRO for
                  gjennomgang.
                </Txt>
                {(
                  Object.entries(reasons) as [keyof typeof reasons, string][]
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    title={`${value === reason ? "✓ " : ""}${label}`}
                    secondary={value !== reason}
                    onPress={() => setReason(value)}
                    disabled={busy}
                  />
                ))}
                <TextInput
                  accessibilityLabel="Beskriv problemet"
                  placeholder="Beskriv problemet (valgfritt)"
                  placeholderTextColor={c.muted}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  maxLength={1000}
                  editable={!busy}
                  style={{
                    color: c.text,
                    borderColor: c.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    minHeight: 100,
                    padding: 14,
                    textAlignVertical: "top",
                  }}
                />
                <Button
                  title={busy ? "Sender …" : "Send rapport"}
                  disabled={busy}
                  onPress={() => {
                    void submit(false);
                  }}
                />
              </>
            )}
            {mode === "block" && (
              <>
                <Txt>
                  Dere skjules for hverandre i personsøk og innlegg.
                  Følgeforhold og forespørsler fjernes. Du kan oppheve
                  blokkeringen under Personvern.
                </Txt>
                <Button
                  title={busy ? "Blokkerer …" : `Blokker ${name}`}
                  danger
                  disabled={busy}
                  onPress={() => {
                    void submit(true);
                  }}
                />
              </>
            )}
            {mode === "sent" && (
              <>
                <Txt>Rapporten er mottatt. Du kan også blokkere brukeren.</Txt>
                <Button
                  title="Blokker bruker"
                  secondary
                  onPress={() => setMode("block")}
                />
              </>
            )}
            {!!error && <Txt accessibilityRole="alert">{error}</Txt>}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
