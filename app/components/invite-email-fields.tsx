"use client";

import { useLanguage } from "@/app/lib/language";

const MAX_EMAILS = 20;

export function growEmails(current: string[], index: number, value: string): string[] {
  const next = current.slice();
  next[index] = value;
  const compact: string[] = [];
  for (let i = 0; i < next.length; i += 1) {
    const item = next[i] ?? "";
    if (item.trim() || i === next.length - 1) compact.push(item);
  }
  const filled = compact.filter((item) => item.trim()).length;
  if (filled >= MAX_EMAILS) return compact.filter((item) => item.trim());
  if (!compact.length || compact[compact.length - 1].trim()) compact.push("");
  return compact;
}

export function listedEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    list.push(email);
  }
  return list;
}

export function InviteEmailFields({
  emails,
  disabled = false,
  onChange,
}: {
  emails: string[];
  disabled?: boolean;
  onChange: (emails: string[]) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      {emails.map((email, index) => (
        <label key={index} className="block text-sm">
          {index === 0 ? <span className="text-muted">{t("common.email")}</span> : <span className="sr-only">{t("common.email")}</span>}
          <input
            type="email"
            required={index === 0}
            value={email}
            disabled={disabled}
            autoComplete="off"
            placeholder={t("common.email.placeholder")}
            onChange={(event) => onChange(growEmails(emails, index, event.target.value))}
            className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none placeholder:text-muted focus:ring-train disabled:cursor-not-allowed"
          />
        </label>
      ))}
    </div>
  );
}
