import { ImageResponse } from "next/og";
import { brandInitial } from "@/app/lib/site-brand";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const brand = await getSiteBrand();
  if (brand.faviconUrl) {
    return new ImageResponse(
      (
        <img src={brand.faviconUrl} width="32" height="32" alt="" />
      ),
      size,
    );
  }
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#102433",
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {brandInitial(brand.name)}
      </div>
    ),
    size,
  );
}
