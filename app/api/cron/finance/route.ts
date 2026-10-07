import { NextResponse, type NextRequest } from "next/server";
import { runFinanceCron } from "@/app/lib/finance-cron";
import { trustedClientIp } from "@/app/lib/security/client-ip";
import { rateLimit } from "@/app/lib/security/rate-limit";

export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  const ip = trustedClientIp(request.headers) || "local";
  if (await rateLimit(`cron:finance:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await runFinanceCron(token);
  if (!result.ok) return NextResponse.json({ ok: false }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  return NextResponse.json(
    { ok: true, enabled: result.enabled, charged: result.charged },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function GET(request: NextRequest) {
  return handle(request);
}

export function POST(request: NextRequest) {
  return handle(request);
}
