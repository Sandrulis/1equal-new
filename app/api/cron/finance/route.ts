import { NextResponse, type NextRequest } from "next/server";
import { runFinanceCron } from "@/app/lib/finance-cron";
import { rateLimit } from "@/app/lib/security/rate-limit";

export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  if (await rateLimit(`cron:finance:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await runFinanceCron(token);
  if (!result.ok) return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
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
