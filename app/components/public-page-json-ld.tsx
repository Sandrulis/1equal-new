import { getIndexableSiteUrl } from "@/app/lib/site";

type Crumb = { name: string; path: string };

function absolute(path: string): string {
  const origin = getIndexableSiteUrl().replace(/\/$/, "");
  if (!path || path === "/") return `${origin}/`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function PublicPageJsonLd({
  path,
  title,
  description,
  lang,
  breadcrumbs,
}: {
  path: string;
  title: string;
  description: string;
  lang: string;
  breadcrumbs: Crumb[];
}) {
  const url = absolute(path);
  const home = absolute("/");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: lang,
        isPartOf: { "@id": `${home}#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absolute(item.path),
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
