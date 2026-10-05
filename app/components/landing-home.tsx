import { LandingPage } from "@/app/components/landing-page";
import { LANDING_FAQ } from "@/app/lib/landing-faq";
import { translate } from "@/app/lib/messages";
import { faqPageJsonLd, homepageJsonLd } from "@/app/lib/public-metadata";
import type { PublicLocale } from "@/app/lib/seo-slugs";
import { publicPath } from "@/app/lib/seo-slugs";
import { displayBrandName } from "@/app/lib/site-brand";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

const FEATURE_KEYS = [
  "landing.feature.calendar.title",
  "landing.feature.team.title",
  "landing.feature.invite.title",
  "landing.feature.vote.title",
  "landing.feature.money.title",
  "landing.feature.venues.title",
] as const;

export async function LandingHome({ locale }: { locale: PublicLocale }) {
  const brand = await getSiteBrand();
  const title = translate(locale, "landing.seo.title");
  const description = translate(locale, "landing.seo.description");
  const path = publicPath(locale, "/");
  const jsonLd = homepageJsonLd({
    locale,
    path,
    title,
    description,
    name: displayBrandName(brand.name),
    logoUrl: brand.logoUrl,
    contactEmail: brand.contactEmail,
    featureList: FEATURE_KEYS.map((key) => translate(locale, key)),
  });
  const faqLd = faqPageJsonLd(
    locale,
    LANDING_FAQ.map((item) => ({ q: translate(locale, item.q), a: translate(locale, item.a) })),
  );

  return (
    <>
      <script id="landing-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script id="landing-faq-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <LandingPage />
    </>
  );
}
