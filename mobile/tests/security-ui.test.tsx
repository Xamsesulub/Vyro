import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { Session } from "@supabase/supabase-js";
import { BackupSettings } from "../src/components/BackupSettings";
import SafetyActions from "../src/components/SafetyActions";
import DeleteAccount from "../src/app/settings/delete-account";
import { useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";

const mockUnlock = jest.fn();
const mockRemote = jest.fn();
const mockSync = jest.fn();
const mockRpc = jest.fn();
const mockDelete = jest.fn();
const code =
  "ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: null,
}));
jest.mock("../src/features/backup/vault", () => ({
  remoteVault: (...a: unknown[]) => mockRemote(...a),
  unlockVault: (...a: unknown[]) => mockUnlock(...a),
  vaultKey: jest.fn(),
}));
jest.mock("../src/features/backup/cipher", () => ({
  newRecoveryCode: async () =>
    "ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234-ABCD1234",
  normalizeRecoveryCode: (c: string) => c.replaceAll("-", "").toLowerCase(),
}));
jest.mock("../src/features/backup/sync", () => ({
  useBackupStatus: () => ({ busy: false }),
  cancelBackup: jest.fn(),
  syncBackup: (...a: unknown[]) => mockSync(...a),
  restoreBackup: jest.fn(),
  deleteBackups: jest.fn(),
}));
jest.mock("../src/features/social/api", () => ({
  client: () => ({ rpc: mockRpc }),
  socialError: () => "Kunne ikke lagre.",
}));
jest.mock("../src/features/auth/deleteAccount", () => ({
  deleteOwnAccount: (...a: unknown[]) => mockDelete(...a),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock("../src/components/AccountGate", () => ({
  AccountGate: ({ children }: { children: unknown }) => children,
}));
jest.mock("../src/components/SettingsUi", () => ({
  Page: ({ children }: { children: unknown }) => children,
}));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    useTheme: () => ({}),
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
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "owner" } } as Session,
  });
  useAppStore.setState({ backupOwners: [], workouts: [], backupReceipts: {} });
  mockRemote.mockResolvedValue(null);
  mockUnlock.mockResolvedValue({});
  mockRpc.mockResolvedValue({ data: "receipt" });
  mockDelete.mockResolvedValue({ localCleanupComplete: true });
});

test("backup opt-in requires the exact saved code before enabling uploads", async () => {
  await render(<BackupSettings owner="owner" />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Aktiver privat sikkerhetskopi" }),
  );
  await waitFor(() => expect(screen.getByText(code)).toBeTruthy());
  await fireEvent.changeText(
    screen.getByLabelText("Gjenopprettingskode"),
    "wrong",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Bekreft og aktiver" }),
  );
  expect(mockUnlock).not.toHaveBeenCalled();
  expect(useAppStore.getState().backupOwners).toEqual([]);
  await fireEvent.changeText(
    screen.getByLabelText("Gjenopprettingskode"),
    code,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Bekreft og aktiver" }),
  );
  await waitFor(() => expect(mockSync).toHaveBeenCalledWith("owner"));
  expect(useAppStore.getState().backupOwners).toEqual(["owner"]);
  expect(screen.queryByText(code)).toBeNull();
});
test("wrong recovery code on a new device leaves backup disabled and shows error", async () => {
  mockRemote.mockResolvedValue({ key_id: "existing" });
  mockUnlock.mockRejectedValue(new Error("Feil kode"));
  await render(<BackupSettings owner="owner" />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Aktiver privat sikkerhetskopi" }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Gjenopprettingskode")).toBeTruthy(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Gjenopprettingskode"),
    code,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Bekreft og aktiver" }),
  );
  await waitFor(() => expect(screen.getByText("Feil kode")).toBeTruthy());
  expect(useAppStore.getState().backupOwners).toEqual([]);
  expect(mockSync).not.toHaveBeenCalled();
});
test("blocking waits for explicit confirmation and successful server response", async () => {
  const blocked = jest.fn();
  await render(
    <SafetyActions
      owner="owner"
      target="other"
      name="Mina"
      onBlocked={blocked}
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Flere valg for Mina" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Blokker bruker" }));
  expect(mockRpc).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Blokker Mina" }));
  await waitFor(() => expect(blocked).toHaveBeenCalledTimes(1));
  expect(mockRpc).toHaveBeenCalledWith("vyro_block", {
    p_target: "other",
    p_block: true,
  });
});
test("report sends chosen reason and correct post, then shows receipt", async () => {
  await render(
    <SafetyActions
      owner="owner"
      target="other"
      name="Mina"
      postId="post"
      onBlocked={jest.fn()}
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Flere valg for Mina" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Rapporter" }));
  await fireEvent.press(screen.getByRole("button", { name: "Spam" }));
  await fireEvent.changeText(
    screen.getByLabelText("Beskriv problemet"),
    "  Relevant detail  ",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Send rapport" }));
  await waitFor(() =>
    expect(
      screen.getByText("Rapporten er mottatt. Du kan også blokkere brukeren."),
    ).toBeTruthy(),
  );
  expect(mockRpc).toHaveBeenCalledWith("vyro_report", {
    p_target: "other",
    p_reason: "spam",
    p_details: "Relevant detail",
    p_post: "post",
    p_place: null,
  });
});
test("account deletion cannot submit until SLETT is entered", async () => {
  await render(<DeleteAccount />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Slett kontoen min permanent" }),
  );
  expect(mockDelete).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText("Bekreft kontosletting"),
    "SLETT",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Slett kontoen min permanent" }),
  );
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("owner"));
});
