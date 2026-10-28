import { useState } from "react";
import { Pressable, Text } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import PostComments from "../src/components/PostComments";
import { client } from "../src/features/social/api";
import { requireOwner } from "../src/features/social/profiles";
jest.mock("../src/features/social/api", () => ({
  client: jest.fn(),
  socialError: () => "Kunne ikke lagre kommentaren.",
}));
jest.mock("../src/features/social/profiles", () => ({
  requireOwner: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("../src/components/SocialUi", () => ({ Avatar: () => null }));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    Icon: () => null,
    useTheme: () => ({}),
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: "button", accessibilityLabel: title },
        React.createElement(Text, null, title),
      ),
  };
});
const mine = {
  id: "mine",
  author_id: "viewer",
  body: "Min kommentar",
  profiles: { id: "viewer", display_name: "Alex", username: "alex" },
};
const other = {
  ...mine,
  id: "other",
  author_id: "friend",
  body: "Hei fra Mina",
  profiles: { ...mine.profiles, id: "friend", display_name: "Mina" },
};
let rows: (typeof mine)[];
let readError: boolean;
let write: jest.Mock;
let insert: jest.Mock;
let remove: jest.Mock;
let eq: jest.Mock;
function Harness() {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(true);
  return open ? (
    <PostComments
      postId="post"
      userId="viewer"
      draft={draft}
      onDraftChange={setDraft}
      onClose={() => setOpen(false)}
    />
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Åpne"
      onPress={() => setOpen(true)}
    >
      <Text>Åpne</Text>
    </Pressable>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  (requireOwner as jest.Mock).mockImplementation(() => {});
  rows = [other, mine];
  readError = false;
  write = jest.fn().mockResolvedValue({ error: null });
  eq = jest.fn().mockReturnThis();
  const mutation = { eq, abortSignal: (...args: unknown[]) => write(...args) };
  insert = jest.fn(() => mutation);
  remove = jest.fn(() => mutation);
  const query = {
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    abortSignal: jest.fn(async () =>
      readError
        ? { error: { code: "NETWORK" } }
        : { data: [...rows], error: null },
    ),
  };
  (client as jest.Mock).mockReturnValue({
    from: () => ({ select: () => query, insert, delete: remove }),
  });
});

test("comments open in a separate panel; closing and reopening preserves the unsent draft", async () => {
  await render(<Harness />);
  expect(await screen.findByText("Hei fra Mina")).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText("Skriv kommentar"),
    "Dette vil jeg skrive senere",
  );
  await fireEvent.press(screen.getByLabelText("Ferdig med kommentarer"));
  expect(screen.queryByLabelText("Skriv kommentar")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Åpne"));
  expect(screen.getByDisplayValue("Dette vil jeg skrive senere")).toBeTruthy();
});

test("failed writes keep the draft; successful writes clear it even when the refresh fails", async () => {
  await render(<Harness />);
  await screen.findByText("Min kommentar");
  await fireEvent.changeText(
    screen.getByLabelText("Skriv kommentar"),
    "  God tur!  ",
  );
  write.mockResolvedValueOnce({ error: { code: "NETWORK" } });
  await fireEvent.press(screen.getByLabelText("Publiser kommentar"));
  expect(await screen.findByText("Kunne ikke lagre kommentaren.")).toBeTruthy();
  expect(screen.getByDisplayValue("  God tur!  ")).toBeTruthy();
  readError = true;
  await fireEvent.press(screen.getByLabelText("Publiser kommentar"));
  expect(insert).toHaveBeenLastCalledWith({
    post_id: "post",
    author_id: "viewer",
    body: "God tur!",
  });
  await waitFor(() =>
    expect(screen.getByLabelText("Skriv kommentar").props.value).toBe(""),
  );
  expect(
    await screen.findByText("Kunne ikke hente kommentarene. Prøv igjen."),
  ).toBeTruthy();
});

test("rapid taps cannot send duplicate comments", async () => {
  await render(<Harness />);
  await fireEvent.changeText(screen.getByLabelText("Skriv kommentar"), "Hei!");
  let finish!: (value: unknown) => void;
  write.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await fireEvent.press(screen.getByLabelText("Publiser kommentar"));
  await fireEvent.press(screen.getByLabelText("Publiser kommentar"));
  expect(insert).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ error: null });
  });
});

test("only own comments can be deleted, with confirmation and owner/post filters", async () => {
  await render(<Harness />);
  await screen.findByText("Min kommentar");
  expect(screen.getAllByLabelText("Slett din kommentar")).toHaveLength(1);
  await fireEvent.press(screen.getByLabelText("Slett din kommentar"));
  expect(remove).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Bekreft sletting"));
  await waitFor(() => expect(screen.queryByText("Min kommentar")).toBeNull());
  expect(screen.getByText("Hei fra Mina")).toBeTruthy();
  expect(eq.mock.calls).toEqual([
    ["id", "mine"],
    ["post_id", "post"],
    ["author_id", "viewer"],
  ]);
});

test("switching accounts prevents a pending draft being sent as another user", async () => {
  await render(<Harness />);
  await screen.findByText("Min kommentar");
  await fireEvent.changeText(screen.getByLabelText("Skriv kommentar"), "Hei");
  (requireOwner as jest.Mock).mockImplementation(() => {
    throw new Error("Account changed");
  });
  await fireEvent.press(screen.getByLabelText("Publiser kommentar"));
  expect(insert).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("Hei")).toBeTruthy();
});
