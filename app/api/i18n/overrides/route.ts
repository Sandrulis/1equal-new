import { loadTranslationOverrides } from "@/app/lib/site-admin/repository";

export async function GET() {
  const overrides = await loadTranslationOverrides();
  return Response.json(overrides, {
    headers: { "cache-control": "private, max-age=60" },
  });
}
