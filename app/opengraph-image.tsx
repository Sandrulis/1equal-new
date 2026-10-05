import { ImageResponse } from "next/og";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export const alt = "1Equal sporta komandas vadība";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const brand = await getSiteBrand();
  const name = brand.name.toLowerCase() === "1equal" ? "1Equal" : brand.name;
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
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 0.4, color: "#9fd4c8" }}>Sports team management</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 650, lineHeight: 1 }}>{name}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 36, color: "#c5d4de" }}>Games, training, attendance and team expenses</div>
      </div>
    </div>,
    { ...size },
  );
}
