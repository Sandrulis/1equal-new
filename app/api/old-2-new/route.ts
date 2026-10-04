import { getAccountProfile } from "@/app/lib/auth/session";
import { importPingvini, scanPingvini } from "@/app/lib/old-2-new/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const account = await getAccountProfile();
  if (!account) return Response.json({ ok: false }, { status: 401 });
  if (!account.isAdmin) return Response.json({ ok: false }, { status: 403 });

  let body: { phase?: string; confirm?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const phase = body.phase === "import" ? "import" : "scan";
  if (phase === "import" && body.confirm !== true) return Response.json({ ok: false }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        if (phase === "scan") send({ type: "report", report: await scanPingvini() });
        else {
          await importPingvini((event) => send({ type: "progress", ...event }));
          send({ type: "done" });
        }
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "old2new.error.failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
