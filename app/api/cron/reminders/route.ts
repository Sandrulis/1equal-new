import { NextResponse, type NextRequest } from "next/server";
import { reminderCronAuthorized, runEventReminders } from "@/app/lib/push/send-event-reminders";
import { trustedClientIp } from "@/app/lib/security/client-ip";
import { rateLimit } from "@/app/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const quiet = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

async function handle(request: NextRequest) {
  const ip = trustedClientIp(request.headers) || "local";
  if (await rateLimit(`cron:reminders:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: quiet });
  }
  if (!(await reminderCronAuthorized(request))) {
    return NextResponse.json({ ok: false }, { status: 404, headers: quiet });
  }
  const result = await runEventReminders();
  if (!result.ok) return NextResponse.json({ ok: false }, { status: 500, headers: quiet });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
