import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
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
