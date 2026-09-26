import { voteFromEmailLink } from "@/app/lib/email/event-mail";
import { translate, type Lang, type MessageKey } from "@/app/lib/messages";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function isPrefetch(request: Request): boolean {
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("x-purpose") ?? ""} ${request.headers.get("x-moz") ?? ""}`.toLowerCase();
  return purpose.includes("prefetch") || purpose.includes("preview");
}

function page(lang: Lang, title: string, summary: string, body: string): Response {
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:32px 16px;background:#eef3f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#12202b;">
  <main style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e3e8ee;border-radius:16px;padding:28px;">
    <h1 style="margin:0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
    ${summary ? `<p style="margin:12px 0 0;color:#5c6b76;">${escapeHtml(summary)}</p>` : ""}
    <div style="margin-top:20px;font-size:15px;line-height:1.5;">${body}</div>
  </main>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

function form(action: string, label: string, color: string): string {
  return `<form method="post" action="${escapeHtml(action)}" style="display:inline;"><button type="submit" style="margin:0 8px 8px 0;padding:12px 18px;border:0;border-radius:10px;background:${color};color:#ffffff;font-weight:600;cursor:pointer;">${escapeHtml(label)}</button></form>`;
}

export function HEAD(): Response {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export async function GET(_request: Request, context: { params: Promise<{ token: string; choice: string }> }): Promise<Response> {
  const { token, choice } = await context.params;
  const safeToken = /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : "";
  const goingAction = safeToken ? `/v/${safeToken}/going` : "/dashboard";
  const absentAction = safeToken ? `/v/${safeToken}/absent` : "/dashboard";
  const lang: Lang = "lv";
  const preferred = choice === "absent" ? "absent" : "going";
  return page(
    lang,
    translate(lang, "email.vote.hint"),
    "",
    `${form(goingAction, translate(lang, "email.vote.going"), preferred === "going" ? "#178a45" : "#6f8f78")}${form(absentAction, translate(lang, "email.vote.absent"), preferred === "absent" ? "#b4332a" : "#a56b66")}`,
  );
}

export async function POST(request: Request, context: { params: Promise<{ token: string; choice: string }> }): Promise<Response> {
  if (isPrefetch(request)) return new Response(null, { status: 204 });
  const { token, choice } = await context.params;
  const result = await voteFromEmailLink(token, choice);
  const lang = result.lang;
  const safeToken = /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : "";
  const goingAction = safeToken ? `/v/${safeToken}/going` : "/dashboard";
  const absentAction = safeToken ? `/v/${safeToken}/absent` : "/dashboard";
  const choiceLabel = (value: "going" | "absent") => translate(lang, value === "going" ? "email.vote.going" : "email.vote.absent");
  const openApp = `<p style="margin:16px 0 0;"><a href="${escapeHtml(result.dashboardUrl)}" style="color:#102433;font-weight:600;">${escapeHtml(translate(lang, "email.vote.open"))}</a></p>`;

  const titles: Record<typeof result.state, MessageKey> = {
    going: "email.vote.saved_going",
    absent: "email.vote.saved_absent",
    closed: "email.vote.closed",
    invalid: "email.vote.invalid",
    error: "email.vote.error",
  };
  let body = "";
  if (result.state === "going" || result.state === "absent") {
    const other = result.state === "going" ? "absent" : "going";
    const otherAction = other === "going" ? goingAction : absentAction;
    body = `${form(otherAction, translate(lang, "email.vote.change", { choice: choiceLabel(other) }), other === "going" ? "#178a45" : "#b4332a")}${openApp}`;
  } else if (result.state === "closed" && (result.current === "going" || result.current === "absent")) {
    body = `<p style="margin:0;">${escapeHtml(translate(lang, "email.vote.closed_current", { choice: choiceLabel(result.current) }))}</p>${openApp}`;
  } else {
    body = openApp;
  }
  const title = result.state === "closed" && (result.current === "going" || result.current === "absent")
    ? translate(lang, "email.vote.closed")
    : translate(lang, titles[result.state]);
  return page(lang, title, result.summary, body);
}
