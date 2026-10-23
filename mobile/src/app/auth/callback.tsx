import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useLinkingURL } from "expo-linking";
import { Button, Screen, Txt } from "../../components/ui";
import {
  authFragment,
  completeAuthCode,
  completeTokenLink,
} from "../../features/auth/links";
import { authErrorMessage } from "../../features/auth/validation";

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
  }>();
  const code = typeof params.code === "string" ? params.code : undefined;
  const {
    accessToken,
    refreshToken,
    type,
    errorCode: fragmentError,
    hasError,
  } = authFragment(useLinkingURL());
  const errorCode =
    typeof params.error_code === "string" ? params.error_code : fragmentError;
  const [failure, setFailure] = useState<{ code: string; message: string }>();
  const linkId = code ?? accessToken;
  const invalid =
    (!code && !(accessToken && refreshToken)) ||
    errorCode ||
    params.error ||
    hasError;
  const message = invalid
    ? errorCode
      ? authErrorMessage({ code: errorCode })
      : "Lenken kunne ikke brukes. Prøv å logge inn, eller be om en ny lenke."
    : failure?.code === linkId
      ? failure.message
      : "";
  useEffect(() => {
    let active = true;
    if (invalid) return;
    const exchange = code
      ? completeAuthCode(code)
      : completeTokenLink(accessToken, refreshToken).then(() => ({
          recovery: type === "recovery",
        }));
    void exchange
      .then(({ recovery }) => {
        if (active) router.replace(recovery ? "/auth/new-password" : "/(tabs)");
      })
      .catch((error) => {
        if (active)
          setFailure({ code: linkId, message: authErrorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [code, invalid, accessToken, refreshToken, type, linkId]);
  return (
    <Screen>
      <Txt size={28} weight="700">
        {message ? "Sjekk innloggingen" : "Bekrefter kontoen …"}
      </Txt>
      {!!message && (
        <>
          <Txt>{message}</Txt>
          <Button
            title="Til innlogging"
            onPress={() => router.replace("/account")}
          />
        </>
      )}
    </Screen>
  );
}
