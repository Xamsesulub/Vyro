import { createClient } from "npm:@supabase/supabase-js@2";
import { dispatchJobs } from "./worker.ts";

Deno.serve(async (request) => {
  const secret = Deno.env.get("VYRO_PUSH_WORKER_SECRET");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  try {
    const { data, error } = await db.rpc("vyro_claim_push");
    if (error) throw error;
    await dispatchJobs(
      data ?? [],
      async (job, result, ticket, code) => {
        const saved = await db.rpc("vyro_finish_push", {
          p_id: job.id,
          p_lease: job.lease,
          p_result: result,
          p_ticket: ticket ?? null,
          p_error: code ?? null,
        });
        if (saved.error) throw saved.error;
      },
      fetch,
      Deno.env.get("EXPO_ACCESS_TOKEN"),
    );
    return Response.json({ processed: data?.length ?? 0 });
  } catch {
    // Never log addresses, auth tokens or notification payloads.
    return Response.json(
      { error: "Notification delivery will retry" },
      { status: 503 },
    );
  }
});
