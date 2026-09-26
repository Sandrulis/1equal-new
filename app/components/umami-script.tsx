"use client";

import { useEffect } from "react";
import { useCookieConsent } from "@/app/components/cookie-consent";

export function UmamiScript({ websiteId, scriptUrl }: { websiteId: string | null; scriptUrl: string | null }) {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (!websiteId || !scriptUrl || !consent?.analytics) return;
    const selector = `script[data-website-id="${CSS.escape(websiteId)}"]`;
    if (document.querySelector(selector)) return;
    const script = document.createElement("script");
    script.defer = true;
    script.src = scriptUrl;
    script.dataset.websiteId = websiteId;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [consent?.analytics, scriptUrl, websiteId]);

  return null;
}
