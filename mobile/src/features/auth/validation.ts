export type AccountMode = "login" | "register" | "reset";

export function validateAccount(input: {
  mode: AccountMode;
  email: string;
  password: string;
  confirmation: string;
  name: string;
  lastName?: string;
}): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    return "Skriv inn en gyldig e-postadresse.";
  if (input.mode === "reset") return;
  if (!input.password) return "Skriv inn passordet ditt.";
  if (input.mode === "register") {
    if (!input.name.trim() || input.name.trim().length > 50)
      return "Skriv inn navnet ditt (maks 50 tegn).";
    if ((input.lastName?.trim().length ?? 0) > 50)
      return "Etternavnet kan ha maks 50 tegn.";
    return validatePassword(input.password, input.confirmation);
  }
}

export function validatePassword(password: string, confirmation: string) {
  if (password.length < 8) return "Passordet må ha minst 8 tegn.";
  if (password !== confirmation) return "Passordene er ikke like.";
}

export function authErrorMessage(error: unknown): string {
  const { code, message, name } = (error ?? {}) as {
    code?: string;
    message?: string;
    name?: string;
  };
  if (message?.includes("VYRO_REQUEST_TIMEOUT"))
    return "Serveren brukte for lang tid. Sjekk forbindelsen og prøv igjen.";
  switch (code) {
    case "provider_disabled":
    case "oauth_provider_not_supported":
      return "Denne innloggingsmåten er ikke tilgjengelig ennå. Bruk e-post.";
    case "oauth_failed":
    case "bad_oauth_callback":
    case "bad_oauth_state":
    case "bad_id_token":
      return "Innloggingen kunne ikke bekreftes. Prøv igjen, eller bruk e-post.";
    case "invalid_credentials":
      return "Feil e-post eller passord.";
    case "email_not_confirmed":
      return "Bekreft e-postadressen før du logger inn.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "For mange forsøk. Vent litt og prøv igjen.";
    case "email_address_invalid":
      return "Skriv inn en gyldig e-postadresse.";
    case "weak_password":
      return "Velg et sterkere passord med minst 8 tegn.";
    case "same_password":
      return "Velg et annet passord enn det gamle.";
    case "reauthentication_needed":
      return "Logg inn på nytt før du endrer passordet, eller be om en ny passordlenke.";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
    case "pkce_verifier_not_found":
    case "pkce_verifier_mismatch":
      return "Lenken er utløpt eller åpnet på en annen enhet. Be om en ny lenke og åpne den på enheten du brukte.";
    case "email_address_not_authorized":
      return "E-postutsending er ikke åpnet for denne adressen ennå. VYROs e-posttjeneste må konfigureres.";
    case "signup_disabled":
      return "Registrering er midlertidig stengt. Prøv igjen senere.";
  }
  if (name === "AuthRetryableFetchError" || name === "TypeError")
    return "Får ikke kontakt med serveren. Sjekk nettforbindelsen og prøv igjen.";
  return "Kunne ikke fullføre. Prøv igjen om litt.";
}
