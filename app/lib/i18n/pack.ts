import { messages, type Lang } from "@/app/lib/messages";

export function messagePack(lang: Lang): Record<string, string> {
  const pack: Record<string, string> = {};
  for (const key of Object.keys(messages) as (keyof typeof messages)[]) {
    pack[key] = messages[key][lang];
  }
  return pack;
}
