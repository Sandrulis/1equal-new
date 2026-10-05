import { voteFromEmailLink } from "@/app/lib/email/event-mail";

function isPrefetch(request: Request): boolean {
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("x-purpose") ?? ""} ${request.headers.get("x-moz") ?? ""}`.toLowerCase();
  return purpose.includes("prefetch") || purpose.includes("preview");
}

export async function POST(request: Request): Promise<Response> {
  if (isPrefetch(request)) return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  let token = "";
  let choice = "";
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { token?: unknown; choice?: unknown } | null;
    token = typeof body?.token === "string" ? body.token : "";
    choice = typeof body?.choice === "string" ? body.choice : "";
  } else {
    const form = await request.formData().catch(() => null);
    token = String(form?.get("token") ?? "");
    choice = String(form?.get("choice") ?? "");
  }
  const result = await voteFromEmailLink(token, choice);
  return Response.json(
    { state: result.state, summary: result.summary, current: result.current, dashboardUrl: result.dashboardUrl },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
