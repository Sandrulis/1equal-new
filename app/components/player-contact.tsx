"use client";

import { originLabel } from "@/app/lib/country-name";
import { useLanguage } from "@/app/lib/language";

export function PlayerContact({
  email,
  phone,
  originIp = "",
  originCountry = "",
}: {
  email: string;
  phone: string;
  originIp?: string;
  originCountry?: string;
}) {
  const { lang } = useLanguage();
  const contact = [email.trim(), phone.trim()].filter(Boolean).join(" • ");
  const origin = originLabel(originIp, originCountry, lang);
  return (
    <>
      {contact ? <span className="block truncate text-sm text-muted">{contact}</span> : null}
      {origin ? <span className="block truncate text-sm text-muted">{origin}</span> : null}
    </>
  );
}
