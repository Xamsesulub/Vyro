import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { deleteAccount } from "./handler.ts";
Deno.serve((request) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return deleteAccount(request, {
    user: async (token) => {
      const r = await admin.auth.getUser(token);
      return { data: r.data.user, error: r.error };
    },
    begin: async (owner, session) =>
      await admin.rpc("vyro_begin_account_deletion", {
        p_owner: owner,
        p_session: session,
      }),
    files: async (bucket, owner) =>
      await admin.storage
        .from(bucket)
        .list(owner, { limit: 100, sortBy: { column: "name", order: "asc" } }),
    remove: async (bucket, names) =>
      await admin.storage.from(bucket).remove(names),
    deleteUser: async (owner) => await admin.auth.admin.deleteUser(owner),
  });
});
