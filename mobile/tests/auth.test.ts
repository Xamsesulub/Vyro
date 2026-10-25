import {
  authErrorMessage,
  validateAccount,
  validatePassword,
} from "../src/features/auth/validation";
import { timeoutFetch } from "../src/lib/request";

test("rejects invalid registration locally but accepts existing short passwords at login", () => {
  const input = {
    mode: "register" as const,
    name: "Løper",
    email: " runner@example.com ",
    password: "long-password",
    confirmation: "long-password",
  };
  expect(validateAccount(input)).toBeUndefined();
  expect(validateAccount({ ...input, lastName: "   " })).toBeUndefined();
  expect(
    validateAccount({ ...input, lastName: "Ødegård-Hansen" }),
  ).toBeUndefined();
  expect(validateAccount({ ...input, lastName: "x".repeat(51) })).toContain(
    "Etternavnet",
  );
  expect(validateAccount({ ...input, email: "wrong" })).toContain("e-post");
  expect(validateAccount({ ...input, name: "  " })).toContain("navnet");
  expect(validateAccount({ ...input, confirmation: "different" })).toContain(
    "ikke like",
  );
  expect(
    validateAccount({ ...input, mode: "login", password: "old" }),
  ).toBeUndefined();
  expect(
    validateAccount({ ...input, mode: "reset", password: "" }),
  ).toBeUndefined();
  expect(validatePassword("short", "short")).toContain("8 tegn");
});

test("shows useful safe errors without exposing raw server messages", () => {
  expect(authErrorMessage({ code: "invalid_credentials" })).toBe(
    "Feil e-post eller passord.",
  );
  expect(authErrorMessage({ code: "email_not_confirmed" })).toContain(
    "Bekreft",
  );
  expect(authErrorMessage({ code: "email_address_not_authorized" })).toContain(
    "e-posttjeneste",
  );
  expect(authErrorMessage({ code: "flow_state_expired" })).toContain("utløpt");
  expect(authErrorMessage({ message: "VYRO_REQUEST_TIMEOUT" })).toContain(
    "lang tid",
  );
  expect(authErrorMessage(new Error("secret backend detail"))).not.toContain(
    "secret",
  );
});

describe("bounded requests", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  test("aborts a stalled request and never retries a mutation", async () => {
    const fetcher = jest.fn(() => new Promise<Response>(() => {}));
    const request = timeoutFetch(fetcher, 100)("https://example.com", {
      method: "POST",
    });
    const rejected = expect(request).rejects.toThrow("VYRO_REQUEST_TIMEOUT");
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      (fetcher.mock.calls as unknown as [string, RequestInit][])[0][1].signal
        ?.aborted,
    ).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  test("returns fast responses immediately and clears its timer", async () => {
    const response = { ok: true } as Response;
    const fetcher = jest.fn().mockResolvedValue(response);
    await expect(timeoutFetch(fetcher)("https://example.com")).resolves.toBe(
      response,
    );
    expect(jest.getTimerCount()).toBe(0);
  });
  test("forwards cancellation and does not fetch already cancelled requests", async () => {
    const controller = new AbortController();
    const fetcher = jest.fn(() => new Promise<Response>(() => {}));
    const request = timeoutFetch(fetcher)("https://example.com", {
      signal: controller.signal,
    });
    controller.abort();
    await expect(request).rejects.toThrow("VYRO_REQUEST_CANCELLED");
    fetcher.mockClear();
    await expect(
      timeoutFetch(fetcher)("https://example.com", {
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
