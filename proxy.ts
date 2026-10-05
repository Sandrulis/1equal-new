import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/update-session";

function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const host = (forwarded || request.headers.get("host") || "").split(":")[0]?.toLowerCase() ?? "";
  if (host !== "www.1equal.com") return null;
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = "1equal.com";
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export async function proxy(request: NextRequest) {
  const canonical = canonicalHostRedirect(request);
  if (canonical) return canonical;
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("proxy failed", error);
    return NextResponse.next();
  }
}

export const config = {
    matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
