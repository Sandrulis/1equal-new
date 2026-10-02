"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      appearance?: "always" | "execute" | "interaction-only";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(nonce: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile/"]');
    if (existing) {
      if (nonce && !existing.nonce) existing.nonce = nonce;
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    if (nonce) script.nonce = nonce;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed"));
    document.head.appendChild(script);
  });
  turnstileScriptPromise = promise;
  promise.catch(() => {
    if (turnstileScriptPromise === promise) turnstileScriptPromise = null;
  });
  return promise;
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, { siteKey: string; nonce?: string; onTokenChange?: (token: string | null) => void }>(function TurnstileWidget({ siteKey, nonce = "", onTokenChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const updateToken = useCallback(
    (next: string | null) => {
      onTokenChange?.(next);
    },
    [onTokenChange],
  );

  const resetWidget = useCallback(() => {
    updateToken(null);
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, [updateToken]);

  useImperativeHandle(ref, () => ({ reset: resetWidget }), [resetWidget]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;
    void loadTurnstileScript(nonce)
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          appearance: "always",
          callback: (value) => updateToken(value),
          "expired-callback": () => updateToken(null),
          "error-callback": () => updateToken(null),
        });
      })
      .catch(() => updateToken(null));
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [nonce, siteKey, updateToken]);

  return <div ref={containerRef} className="flex min-h-16 justify-center" />;
});
