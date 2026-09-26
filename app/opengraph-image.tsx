import { ImageResponse } from "next/og";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { DEFAULT_SITE_NAME } from "@/app/lib/site-brand";
import { siteDescription } from "@/app/lib/site";

export const alt = DEFAULT_SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const brand = await getSiteBrand();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#102433",
          color: "#ffffff",
          padding: "72px",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 700 }}>{brand.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Komandas sezona vienā vietā</div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "#d5e4ea" }}>{siteDescription}</div>
        </div>
      </div>
    ),
    size,
  );
}
