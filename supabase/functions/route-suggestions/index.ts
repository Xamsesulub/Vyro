import { createRouteHandler } from "./handler.ts";
// Credentials stay in Supabase Edge Function secrets; never EXPO_PUBLIC_*.
Deno.serve(
  createRouteHandler({
    url: Deno.env.get("SUPABASE_URL") ?? "",
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    orsKey: Deno.env.get("ORS_API_KEY"),
    perMinute: Number(Deno.env.get("ORS_REQUESTS_PER_MINUTE") ?? 30),
    perDay: Number(Deno.env.get("ORS_REQUESTS_PER_DAY") ?? 600),
  }),
);
