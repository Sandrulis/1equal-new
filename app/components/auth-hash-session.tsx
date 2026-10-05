"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createBrowserSupabase } from "@/app/lib/supabase/browser";

export function AuthHashSession() {
  const router = useRouter();

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw.includes("access_token=") && !raw.includes("error=")) return;
    const params = new URLSearchParams(raw);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const failed = params.get("error");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (failed || !accessToken || !refreshToken) {
      router.replace("/login?error=confirm");
      return;
    }
    const destination = type === "recovery" ? "/reset-password" : "/dashboard";
    const supabase = createBrowserSupabase();
    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        window.location.replace(error ? "/login?error=confirm" : destination);
      })
      .catch(() => {
        window.location.replace("/login?error=confirm");
      });
  }, [router]);

  return null;
}
