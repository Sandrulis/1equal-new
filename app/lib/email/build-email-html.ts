import { translate, type Lang } from "@/app/lib/messages";

const INK = "#17201c";
const GREEN = "#16a34a";
const MUTED = "#5d6963";
const PAGE = "#f5f7f6";

function escapeHtml(value: string): string {
  return plainDash(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function plainDash(value: string): string {
  return value.replaceAll("—", "-").replaceAll("–", "-");
}

function paragraphsToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:${MUTED};">${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`,
    )
    .join("");
}

function brandMark(name: string): string {
  const match = /equal/i.exec(name);
  if (!match) return escapeHtml(name);
  const before = escapeHtml(name.slice(0, match.index));
  const after = escapeHtml(name.slice(match.index + match[0].length));
  return `${before}<span style="color:${GREEN};">Equal</span>${after}`;
}

function actionButton(label: string, href: string, color: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<a href="${safeHref}" class="email-button" target="_blank" style="display:inline-block;padding:15px 28px;background-color:${color};color:#ffffff;border-radius:9px;font-size:15px;font-weight:700;line-height:1;text-decoration:none;">${safeLabel}</a>`;
}

export function buildEmailHtml(options: {
  systemName: string;
  heading: string;
  bodyText: string;
  buttonLabel: string;
  actionLink: string;
  footerHint: string;
  tagline?: string;
  language?: Lang;
  eyebrow?: string;
  card?: { label: string; title: string; detail?: string };
  vote?: {
    hint: string;
    goingLabel: string;
    goingLink: string;
    absentLabel: string;
    absentLink: string;
  };
}): string {
  const lang = options.language ?? "lv";
  const systemName = options.systemName.trim();
  const heading = escapeHtml(options.heading);
  const mark = brandMark(systemName);
  const bodyHtml = paragraphsToHtml(options.bodyText);
  const eyebrow = options.eyebrow?.trim()
    ? `<div style="margin-top:40px;margin-bottom:12px;font-size:13px;font-weight:700;color:${GREEN};text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(options.eyebrow.trim())}</div>`
    : "";
  const titleMargin = eyebrow ? "0" : "40px 0 0";
  const card = options.card?.title.trim()
    ? `<div style="margin-top:28px;padding:20px;background-color:${PAGE};border-radius:12px;">
        <div style="font-size:12px;font-weight:600;color:#7a857f;text-transform:uppercase;letter-spacing:0.4px;">${escapeHtml(options.card.label)}</div>
        <div style="margin-top:6px;font-size:20px;line-height:1.3;font-weight:700;color:${INK};">${escapeHtml(options.card.title.trim())}</div>
        ${options.card.detail?.trim() ? `<div style="margin-top:8px;font-size:14px;line-height:1.5;color:#68736d;">${escapeHtml(options.card.detail.trim()).replaceAll("\n", "<br />")}</div>` : ""}
      </div>`
    : "";
  const buttonHtml = options.buttonLabel.trim()
    ? `<div style="padding-top:28px;text-align:center;">${actionButton(options.buttonLabel.trim(), options.actionLink, GREEN)}</div>`
    : "";
  const vote = options.vote;
  const voteHtml = vote
    ? `<div style="padding-top:${options.buttonLabel.trim() ? "20px" : "28px"};text-align:center;">
        <div style="margin-bottom:14px;font-size:13px;font-weight:700;color:#68736d;">${escapeHtml(vote.hint)}</div>
        ${actionButton(vote.goingLabel, vote.goingLink, GREEN)}
        <span style="display:inline-block;width:12px;">&nbsp;</span>
        ${actionButton(vote.absentLabel, vote.absentLink, "#b4332a")}
      </div>`
    : "";
  const showLink = Boolean(options.buttonLabel.trim() && options.actionLink.trim());
  const fallbackHtml = showLink
    ? `<div style="margin-top:28px;padding-top:24px;border-top:1px solid #e8ece9;">
        <div style="font-size:12px;font-weight:700;color:#68736d;">${escapeHtml(translate(lang, "email.link.fallback"))}</div>
        <a href="${escapeHtml(options.actionLink.trim())}" target="_blank" style="display:block;margin-top:8px;font-size:12px;line-height:1.5;color:${GREEN};word-break:break-all;text-decoration:underline;">${escapeHtml(options.actionLink.trim())}</a>
      </div>`
    : "";
  const note = options.footerHint.trim();
  const noteHtml = note && note !== systemName
    ? `<div style="margin-top:24px;font-size:13px;line-height:1.5;color:#89938e;">${escapeHtml(note)}</div>`
    : "";
  const taglineText = (options.tagline !== undefined ? options.tagline : translate(lang, "email.footer.tagline")).trim();
  const tagline = taglineText
    ? `<div style="margin-top:8px;font-size:12px;line-height:1.5;color:#9aa39e;">${escapeHtml(taglineText)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${heading}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${PAGE}; }
    @media only screen and (max-width: 600px) {
      .email-wrap { padding: 20px 12px !important; }
      .email-content { padding: 30px 24px !important; }
      .email-footer { padding: 20px 24px 26px !important; }
      .email-title { font-size: 26px !important; }
      .email-button { display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-spacing:0;border-collapse:collapse;">
    <tr>
      <td class="email-wrap" align="center" style="padding:40px 16px;background-color:${PAGE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-spacing:0;border-collapse:collapse;background-color:#ffffff;border-radius:16px;">
          <tr>
            <td class="email-content" style="padding:40px;">
              <div style="font-size:24px;font-weight:800;letter-spacing:-0.8px;color:${INK};">${mark}</div>
              ${eyebrow}
              <h1 class="email-title" style="margin:${titleMargin};font-size:30px;line-height:1.2;letter-spacing:-1px;color:${INK};">${heading}</h1>
              ${bodyHtml}
              ${card}
              ${buttonHtml}
              ${voteHtml}
              ${fallbackHtml}
              ${noteHtml}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="padding:24px 40px 32px;text-align:center;">
              <div style="height:1px;background-color:#e8ece9;margin-bottom:22px;font-size:0;line-height:0;">&nbsp;</div>
              <div style="font-size:15px;font-weight:800;color:${INK};">${mark}</div>
              ${tagline}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function fillEmailText(value: string, params: Record<string, string>): string {
  return value.replace(/\{(\w+)\}/g, (token, key: string) => params[key] ?? token);
}
