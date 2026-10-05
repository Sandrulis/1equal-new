import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { translate } from "@/app/lib/messages";
import { localeFromPathname, publicPath } from "@/app/lib/seo-slugs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const lang = localeFromPathname(pathname) ?? "lv";

  return (
    <div className="flex min-h-screen flex-col bg-ice text-ink">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start px-4 py-16">
        <p className="text-sm font-medium text-muted">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{translate(lang, "notFound.title")}</h1>
        <p className="mt-3 max-w-xl text-muted">{translate(lang, "notFound.text")}</p>
        <Link href={publicPath(lang, "/")} className="mt-8 cursor-pointer rounded-lg bg-navy px-5 py-3 text-sm font-medium text-white hover:bg-navy/90">
          {translate(lang, "notFound.home")}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
