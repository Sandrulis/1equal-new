import { displayBrandName } from "@/app/lib/site-brand";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export async function GET() {
  const brand = await getSiteBrand();
  return Response.json(
    { name: displayBrandName(brand.name), logoUrl: brand.logoUrl },
    { headers: { "cache-control": "public, max-age=60" } },
  );
}
