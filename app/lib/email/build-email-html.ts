import type { Lang } from "@/app/lib/messages";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphsToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 12px;">${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function voteButton(label: string, href: string, color: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:${color};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>`;
}

export function buildEmailHtml(options: {
  systemName: string;
  heading: string;
  bodyText: string;
  buttonLabel: string;
  actionLink: string;
  footerHint: string;
  language?: Lang;
  vote?: {
    hint: string;
    goingLabel: string;
    goingLink: string;
    absentLabel: string;
    absentLink: string;
  };
}): string {
  const systemName = escapeHtml(options.systemName);
  const heading = escapeHtml(options.heading);
  const buttonLabel = escapeHtml(options.buttonLabel);
  const actionLink = escapeHtml(options.actionLink);
  const footerHint = escapeHtml(options.footerHint);
  const bodyHtml = paragraphsToHtml(options.bodyText);
  const vote = options.vote;
  const buttonHtml = options.buttonLabel.trim()
    ? `<tr><td align="center" style="padding:8px 32px ${vote ? "12px" : "28px"};">
          <a href="${actionLink}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:#102433;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${buttonLabel}</a>
        </td></tr>`
    : "";
  const voteHtml = vote
    ? `<tr><td style="padding:8px 32px 4px;font-size:14px;line-height:1.5;font-weight:600;color:#12202b;">${escapeHtml(vote.hint)}</td></tr>
        <tr><td align="center" style="padding:8px 32px 28px;">
          ${voteButton(vote.goingLabel, vote.goingLink, "#178a45")}
          <span style="display:inline-block;width:12px;">&nbsp;</span>
          ${voteButton(vote.absentLabel, vote.absentLink, "#b4332a")}
        </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${options.language ?? "lv"}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#eef3f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e3e8ee;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #eef3f6;">
          <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#5c6b76;">${systemName}</p>
          <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#12202b;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 8px;font-size:15px;line-height:1.6;color:#12202b;">${bodyHtml}</td></tr>
        ${buttonHtml}
        ${voteHtml}
        <tr><td style="padding:0 32px 28px;font-size:12px;line-height:1.5;color:#5c6b76;">${footerHint}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function fillEmailText(value: string, params: Record<string, string>): string {
  return value.replace(/\{(\w+)\}/g, (token, key: string) => params[key] ?? token);
}
