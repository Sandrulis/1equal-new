import { calendarFeedIcs } from "@/app/lib/calendar/feed";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await calendarFeedIcs(decodeURIComponent(token));
  if (!body) return new Response("Calendar not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="calendar.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
    },
  });
}
