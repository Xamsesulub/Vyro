type Result<T> = { data: T; error: unknown };
export type DeletionServices = {
  user: (token: string) => Promise<Result<{ id: string } | null>>;
  begin: (owner: string, session: string) => Promise<{ error: unknown }>;
  files: (
    bucket: string,
    owner: string,
  ) => Promise<Result<{ name: string; id?: string | null }[] | null>>;
  remove: (bucket: string, names: string[]) => Promise<{ error: unknown }>;
  deleteUser: (owner: string) => Promise<{ error: unknown }>;
};
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Cache-Control": "no-store",
};
const reply = (status: number, code: string) =>
  Response.json({ code }, { status, headers });
// getUser verifies the JWT before session_id is inspected. Neither the owner nor
// the storage paths are accepted from request data. Never log credential material.
export async function deleteAccount(
  request: Request,
  service: DeletionServices,
) {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return reply(405, "method");
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token || token.length > 12000) return reply(401, "signin");
  try {
    const raw = await request.text();
    if (raw.length > 100) return reply(400, "confirmation");
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(400, "confirmation");
    }
    if (
      !body ||
      typeof body !== "object" ||
      body.confirmation !== "SLETT" ||
      Object.keys(body).length !== 1
    )
      return reply(400, "confirmation");
    const user = await service.user(token);
    if (user.error || !user.data) return reply(401, "signin");
    const claims = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const session = claims.session_id;
    if (
      typeof session !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(session)
    )
      return reply(401, "signin");
    const owner = user.data.id;
    if ((await service.begin(owner, session)).error)
      return reply(403, "recent_login");
    // Flat UUID-prefixed files only: uploads validate this same path structure.
    // Repeated requests resume cleanup after a timeout, without deleting other users.
    for (const bucket of ["profile-photos", "place-photos"]) {
      let done = false;
      for (let batch = 0; batch < 100; batch++) {
        const list = await service.files(bucket, owner);
        if (list.error || !list.data) return reply(503, "retry_cleanup");
        if (!list.data.length) {
          done = true;
          break;
        }
        if (
          list.data.some(
            (f) => !f.id || /[\\/]/.test(f.name) || f.name === "..",
          )
        )
          return reply(503, "retry_cleanup");
        if (
          (
            await service.remove(
              bucket,
              list.data.map((f) => `${owner}/${f.name}`),
            )
          ).error
        )
          return reply(503, "retry_cleanup");
      }
      if (!done) return reply(503, "retry_cleanup");
    }
    if ((await service.deleteUser(owner)).error)
      return reply(503, "retry_cleanup");
    return reply(200, "deleted");
  } catch {
    return reply(503, "retry_cleanup");
  }
}
