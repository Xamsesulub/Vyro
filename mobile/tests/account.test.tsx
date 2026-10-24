import type { Session } from "@supabase/supabase-js";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));
jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "vyro://auth/callback"),
}));
jest.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resend: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));
jest.mock("../src/components/ui", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return {
    Screen: View,
    Txt: Text,
    useTheme: () => ({ border: "#ddd", text: "#111", muted: "#555" }),
    Button: ({
      title,
      onPress,
      disabled,
    }: {
      title: string;
      onPress: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress,
          disabled,
          accessibilityRole: "button",
          accessibilityLabel: title,
          accessibilityState: { disabled },
        },
        React.createElement(Text, null, title),
      ),
  };
});
import Account from "../src/app/account";
import NewPassword from "../src/app/auth/new-password";
import { router } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/useAuthStore";
const auth = supabase!.auth;
test("password changes require a session and matching passwords", async () => {
  await render(<NewPassword />);
  expect(screen.queryByLabelText("Nytt passord")).toBeNull();
  expect(auth.updateUser).not.toHaveBeenCalled();
  await screen.unmount();
  useAuthStore.setState({ session: { user: { id: "runner" } } as Session });
  (auth.updateUser as jest.Mock).mockResolvedValue({ error: null });
  await render(<NewPassword />);
  await fireEvent.changeText(
    screen.getByLabelText("Nytt passord"),
    "new-long-password",
  );
  await tap("Lagre nytt passord");
  expect(auth.updateUser).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText("Bekreft nytt passord"),
    "new-long-password",
  );
  await tap("Lagre nytt passord");
  expect(auth.updateUser).toHaveBeenCalledWith({
    password: "new-long-password",
  });
  expect(router.replace).toHaveBeenCalledWith("/account");
});
test("registration server failure never shows a confirmation success", async () => {
  (auth.signUp as jest.Mock).mockResolvedValue({
    data: {},
    error: { code: "email_address_not_authorized" },
  });
  await render(<Account />);
  await tap("Ny her? Opprett konto");
  await fillLogin();
  await fireEvent.changeText(screen.getByLabelText("Visningsnavn"), "Løper");
  await fireEvent.changeText(
    screen.getByLabelText("Bekreft passord"),
    "a-long-password",
  );
  await tap("Opprett konto");
  expect(screen.getByText(/e-posttjeneste må konfigureres/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Send bekreftelsen på nytt" }),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Opprett konto" })).toBeEnabled();
  expect(router.replace).not.toHaveBeenCalled();
});
const tap = (name: string) =>
  fireEvent.press(screen.getByRole("button", { name }));
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    session: null,
    ready: true,
    initializationSlow: false,
    confirmationEmail: null,
  });
});
async function fillLogin() {
  await fireEvent.changeText(
    screen.getByLabelText("E-post"),
    " runner@example.com ",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Passord"),
    "a-long-password",
  );
}
test("login responds immediately, blocks duplicate taps and enters the app only with a session", async () => {
  let finish!: (result: unknown) => void;
  (auth.signInWithPassword as jest.Mock).mockImplementation(
    () =>
      new Promise((done) => {
        finish = done;
      }),
  );
  await render(<Account />);
  await fillLogin();
  await tap("Logg inn");
  expect(screen.getByRole("button", { name: "Logger inn …" })).toBeDisabled();
  await tap("Logger inn …");
  expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
  expect(auth.signInWithPassword).toHaveBeenCalledWith({
    email: "runner@example.com",
    password: "a-long-password",
  });
  expect(router.replace).not.toHaveBeenCalled();
  const session = {
    user: { id: "runner", email: "runner@example.com" },
  } as Session;
  await act(async () => finish({ data: { session }, error: null }));
  expect(useAuthStore.getState().session).toBe(session);
  expect(router.replace).toHaveBeenCalledWith("/(tabs)");
});
test("a rejected login restores the button and allows retry", async () => {
  (auth.signInWithPassword as jest.Mock).mockResolvedValue({
    data: {},
    error: { code: "invalid_credentials" },
  });
  await render(<Account />);
  await fillLogin();
  await tap("Logg inn");
  expect(screen.getByText("Feil e-post eller passord.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Logg inn" })).toBeEnabled();
  expect(router.replace).not.toHaveBeenCalled();
});
test("registration validates passwords, keeps login available, and supports resending", async () => {
  (auth.signUp as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: null,
  });
  (auth.resend as jest.Mock).mockResolvedValue({ error: null });
  await render(<Account />);
  await tap("Ny her? Opprett konto");
  await fillLogin();
  await fireEvent.changeText(screen.getByLabelText("Visningsnavn"), "Løper");
  await tap("Opprett konto");
  expect(auth.signUp).not.toHaveBeenCalled();
  expect(screen.getByText("Passordene er ikke like.")).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText("Bekreft passord"),
    "a-long-password",
  );
  await tap("Opprett konto");
  expect(auth.signUp).toHaveBeenCalledWith(
    expect.objectContaining({
      options: {
        data: { display_name: "Løper" },
        emailRedirectTo: "vyro://auth/callback",
      },
    }),
  );
  expect(router.replace).not.toHaveBeenCalled();
  expect(useAuthStore.getState().session).toBeNull();
  expect(useAuthStore.getState().confirmationEmail).toBe("runner@example.com");
  expect(screen.getByRole("button", { name: "Logg inn" })).toBeEnabled();
  expect(screen.queryByText("Bekreft e-posten")).toBeNull();
  expect(
    screen.getByText(/Registrering på nytt endrer ikke passordet/),
  ).toBeTruthy();
  await screen.unmount();
  await render(<Account />);
  expect(screen.getByLabelText("E-post").props.value).toBe(
    "runner@example.com",
  );
  await tap("Send bekreftelsen på nytt");
  expect(auth.resend).toHaveBeenCalledWith({
    type: "signup",
    email: "runner@example.com",
    options: { emailRedirectTo: "vyro://auth/callback" },
  });
});
test("password recovery requests the callback and does not disclose account existence", async () => {
  (auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });
  await render(<Account />);
  await tap("Glemt passord?");
  await fireEvent.changeText(
    screen.getByLabelText("E-post"),
    "runner@example.com",
  );
  await tap("Send tilbakestillingslenke");
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
    "runner@example.com",
    { redirectTo: "vyro://auth/callback" },
  );
  expect(screen.getByText(/Hvis adressen har en konto/)).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
});
test("network exceptions during logout release the button and show a recoverable error", async () => {
  useAuthStore.setState({
    session: { user: { id: "runner", email: "runner@example.com" } } as Session,
  });
  (auth.signOut as jest.Mock).mockRejectedValue(
    new TypeError("network failed"),
  );
  await render(<Account />);
  await tap("Logg ut");
  expect(screen.getByText(/Får ikke kontakt med serveren/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Logg ut" })).toBeEnabled();
});

test("account recovery does not flash a login form before the shared session is ready", async () => {
  useAuthStore.setState({ ready: false });
  await render(<Account />);
  expect(screen.getByText("Laster konto …")).toBeTruthy();
  expect(screen.queryByLabelText("Passord")).toBeNull();
  await act(() =>
    useAuthStore.setState({
      ready: true,
      session: {
        user: { id: "runner", email: "runner@example.com" },
      } as Session,
    }),
  );
  expect(screen.getByText("Du er innlogget i hele VYRO.")).toBeTruthy();
  expect(screen.queryByLabelText("Passord")).toBeNull();
});

test("successful logout clears the shared session even before an SDK event arrives", async () => {
  useAuthStore.setState({ session: { user: { id: "runner" } } as Session });
  (auth.signOut as jest.Mock).mockResolvedValue({ error: null });
  await render(<Account />);
  await tap("Logg ut");
  expect(useAuthStore.getState().session).toBeNull();
  expect(screen.getByLabelText("Passord")).toBeTruthy();
});

test("a login response without a session never pretends to be a pending signup", async () => {
  (auth.signInWithPassword as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: null,
  });
  await render(<Account />);
  await fillLogin();
  await tap("Logg inn");
  expect(useAuthStore.getState().confirmationEmail).toBeNull();
  expect(router.replace).not.toHaveBeenCalled();
  expect(
    screen.getByText("Kunne ikke fullføre. Prøv igjen om litt."),
  ).toBeTruthy();
});
