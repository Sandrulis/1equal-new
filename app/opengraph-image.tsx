import { ImageResponse } from "next/og";
import { siteDescription, siteName } from "@/app/lib/site";

export const alt = siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <div style={{ fontSize: 36, fontWeight: 700 }}>{siteName}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Komandas sezona vienā vietā</div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "#d5e4ea" }}>{siteDescription}</div>
        </div>
      </div>
    ),
    size,
  );
}
