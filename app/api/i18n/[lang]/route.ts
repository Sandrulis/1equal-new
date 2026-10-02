import { messagePack } from "@/app/lib/i18n/pack";
import type { Lang } from "@/app/lib/messages";

const LANGS = new Set<Lang>(["lv", "en", "ru"]);

export async function GET(_request: Request, context: { params: Promise<{ lang: string }> }) {
  const { lang } = await context.params;
  const code: Lang = LANGS.has(lang as Lang) ? (lang as Lang) : "lv";
  return Response.json(messagePack(code), {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
