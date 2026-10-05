"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { useLanguage } from "@/app/lib/language";
import { openJoinLink } from "@/app/lib/team-actions";

export function JoinMissing() {
  const { t } = useLanguage();
  return (
    <main className="grid min-h-screen place-items-center bg-ice px-4">
      <p className="text-sm text-muted">{t("team.join.not_found")}</p>
    </main>
  );
}
export function JoinAccept({ code }: { code: string }) {
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void openJoinLink(code).then((result) => {
      if (result.ok && result.state === "joined") {
        router.replace("/dashboard");
        return;
      }
      if (result.ok) {
        router.replace(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
        return;
      }
      router.replace("/");
    });
  }, [code, router]);
  return (
    <main className="grid min-h-screen place-items-center bg-ice">
      <span className="size-8 animate-spin rounded-full border-2 border-line border-t-navy" aria-hidden="true" />
    </main>
  );
}

export function JoinChoices({ code }: { code: string }) {
  const { t } = useLanguage();
  const next = `/join/${code}`;
  return (
    <div className="flex min-h-screen flex-col bg-ice">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-paper p-6 ring-1 ring-line sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{t("join.invite.title")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{t("join.invite.lead")}</p>
          <div className="mt-6 grid gap-3">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="rounded-lg bg-navy px-4 py-2.5 text-center text-sm font-medium text-white">
              {t("auth.login.title")}
            </Link>
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="rounded-lg bg-ice px-4 py-2.5 text-center text-sm font-medium text-ink ring-1 ring-line">
              {t("auth.signup.title")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
