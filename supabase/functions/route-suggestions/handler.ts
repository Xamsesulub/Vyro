// Retired endpoint for already installed builds. Never contact a routing provider.
// Updated apps use authenticated PostgreSQL RPCs for the community library.
export function retiredRouteHandler(request: Request): Response {
  return new Response(request.method === "OPTIONS" ? null : JSON.stringify({
    code: "ROUTES_UPDATED", message: "Oppdater VYRO for løyper delt av brukerne.",
  }), {
    status: request.method === "OPTIONS" ? 204 : 410,
    headers: {
      "Content-Type": "application/json", "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store",
    },
  });
}
