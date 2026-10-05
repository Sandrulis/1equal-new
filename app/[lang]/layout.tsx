import { PUBLIC_LOCALES } from "@/app/lib/seo-slugs";

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
