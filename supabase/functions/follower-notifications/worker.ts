export type Job = {
  id: string;
  lease: string;
  token: string;
  recipient_id: string;
  kind: "follow" | "request" | "accepted" | "comment" | "like" | "post";
  notice_id?: string;
  ticket: string | null;
  attempts: number;
};
type Result = "ticket" | "delivered" | "unregistered" | "retry" | "failed";
type Finish = (
  job: Job,
  result: Result,
  ticket?: string,
  code?: string,
) => Promise<void>;
type Ticket = { status?: string; id?: string; details?: { error?: string } };
const bodies = {
  follow: "Du har en ny følger.",
  request: "Du har fått en følgeforespørsel.",
  accepted: "Følgeforespørselen din er godkjent.",
  comment: "Du har fått en kommentar på innlegget ditt.",
  like: "Noen likte innlegget ditt.",
  post: "Noen du følger har delt et nytt innlegg.",
};

export async function dispatchJobs(
  jobs: Job[],
  finish: Finish,
  request: typeof fetch = fetch,
  accessToken?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  // Separate send and receipt batches: accepted tickets are never submitted again.
  for (const receipt of [false, true]) {
    const batch = jobs.filter((j) => !!j.ticket === receipt);
    if (!batch.length) continue;
    let payload: { data?: Ticket[] | Record<string, Ticket> };
    try {
      const response = await request(
        `https://exp.host/--/api/v2/push/${receipt ? "getReceipts" : "send"}`,
        {
          method: "POST",
          headers,
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify(
            receipt
              ? { ids: batch.map((j) => j.ticket) }
              : batch.map((j) => ({
                  to: j.token,
                  title: "VYRO",
                  body: bodies[j.kind],
                  sound: "default",
                  channelId: "social",
                  ttl: 3600,
                  data: {
                    screen: "notifications",
                    recipientId: j.recipient_id,
                    ...(j.notice_id ? { notificationId: j.notice_id } : {}),
                  },
                })),
          ),
        },
      );
      if (!response.ok) throw new Error("Push unavailable");
      payload = await response.json();
    } catch {
      await Promise.all(
        batch.map((j) => finish(j, "retry", undefined, "transport")),
      );
      continue;
    }
    await Promise.all(
      batch.map(async (j, i) => {
        const data = payload.data;
        const t = receipt
          ? !Array.isArray(data)
            ? data?.[j.ticket!]
            : undefined
          : Array.isArray(data)
            ? data[i]
            : undefined;
        if (t?.status === "ok" && (receipt || typeof t.id === "string"))
          return finish(
            j,
            receipt ? "delivered" : "ticket",
            receipt ? undefined : t.id,
          );
        const code = t?.details?.error;
        if (code === "DeviceNotRegistered")
          return finish(j, "unregistered", undefined, code);
        if (
          code === "MessageTooBig" ||
          code === "MismatchSenderId" ||
          code === "InvalidCredentials"
        )
          return finish(j, "failed", undefined, code);
        return finish(j, "retry", undefined, code ?? "receipt_pending");
      }),
    );
  }
}
