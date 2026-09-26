import { ImageResponse } from "next/og";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export const alt = "Komandas vadība vienuviet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const brand = await getSiteBrand();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#102433",
        color: "#eef3f6",
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 1, color: "#9fd4c8" }}>Komandas vadība</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 650, lineHeight: 1 }}>{brand.name}</div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 36, color: "#c5d4de" }}>Vienuviet</div>
      </div>
    </div>,
    { ...size },
  );
}
