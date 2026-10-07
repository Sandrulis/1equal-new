"use client";

import { useEffect, useRef, useState } from "react";
import { ContentImage } from "@/app/components/content-image";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { parseEhlTeamUrl } from "@/app/lib/ehl-team";
import { lookupEhlTeamName } from "@/app/lib/ehl-team-lookup";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

export function sameEhlTeam(source: string, team: ResolvedEhlTeam | null): team is ResolvedEhlTeam {
  if (!team) return false;
  return parseEhlTeamUrl(source)?.toString() === team.url;
}

export type ResolvedEhlTeam = {
  name: string;
  url: string;
  logoUrl: string | null;
  homeKitUrl: string | null;
  awayKitUrl: string | null;
};

const LINK_ERROR: Record<"invalid" | "not_found" | "failed", MessageKey> = {
  invalid: "team.link.invalid",
  not_found: "team.link.not_found",
  failed: "team.link.failed",
};

export function EhlTeamLinkField({
  value,
  disabled = false,
  autoFocus = false,
  seed = null,
  inputClassName,
  onChange,
  onResolved,
  onLoading,
}: {
  value: string;
  disabled?: boolean;
  autoFocus?: boolean;
  seed?: ResolvedEhlTeam | null;
  inputClassName?: string;
  onChange: (value: string) => void;
  onResolved: (team: ResolvedEhlTeam | null) => void;
  onLoading?: (loading: boolean) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const onResolvedRef = useRef(onResolved);
  const onLoadingRef = useRef(onLoading);
  const seedRef = useRef(seed);
  const [team, setTeam] = useState<ResolvedEhlTeam | null>(null);
  const [error, setError] = useState<{ url: string; key: MessageKey } | null>(null);

  useEffect(() => {
    onResolvedRef.current = onResolved;
  }, [onResolved]);

  useEffect(() => {
    onLoadingRef.current = onLoading;
  }, [onLoading]);

  useEffect(() => {
    seedRef.current = seed;
  }, [seed]);

  useEffect(() => {
    const parsed = parseEhlTeamUrl(value);
    if (!parsed) return;
    let cancelled = false;
    const quiet = sameEhlTeam(value, seedRef.current);
    const timer = window.setTimeout(() => {
      if (!quiet) {
        onLoadingRef.current?.(true);
        showFeedback({ message: t("team.empty.checking"), variant: "info" });
      }
      void lookupEhlTeamName(parsed.toString()).then((result) => {
        if (cancelled) return;
        if (!quiet) onLoadingRef.current?.(false);
        if (!result.ok) {
          if (quiet) return;
          setTeam(null);
          setError({ url: parsed.toString(), key: LINK_ERROR[result.error] });
          showFeedback({ message: t(LINK_ERROR[result.error]), variant: "error" });
          return;
        }
        const next: ResolvedEhlTeam = {
          name: result.name,
          url: result.url,
          logoUrl: result.logoUrl,
          homeKitUrl: result.homeKitUrl,
          awayKitUrl: result.awayKitUrl,
        };
        setError(null);
        setTeam(next);
        onResolvedRef.current(next);
      });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      onLoadingRef.current?.(false);
    };
  }, [showFeedback, t, value]);

  const parsed = parseEhlTeamUrl(value);
  const fetched = team && parsed && sameEhlTeam(value, team) ? team : null;
  const shown = fetched ?? (parsed && sameEhlTeam(value, seed) ? seed : null);
  const visibleError = error && parsed && error.url === parsed.toString() && !fetched ? error.key : null;
  const columns = shown
    ? [
        { label: t("site_settings.form.logo"), src: shown.logoUrl },
        { label: t("event.game.home"), src: shown.homeKitUrl },
        { label: t("event.game.away"), src: shown.awayKitUrl },
      ]
    : [];

  return (
    <div>
      <label className="text-sm font-medium">
        {t("team.empty.link")}
        <span className="ml-2 font-normal text-muted">{t("team.empty.link_optional")}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("team.empty.link_placeholder")}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          autoFocus={autoFocus}
          className={inputClassName ?? "mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm font-normal text-ink ring-1 ring-line outline-none placeholder:text-muted focus:ring-train disabled:opacity-60"}
        />
      </label>
      {visibleError ? <p className="mt-2 text-sm text-red-700">{t(visibleError)}</p> : null}
      {columns.length > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {columns.map((column) => (
            <div key={column.label} className="flex min-w-0 flex-col items-center gap-1">
              <div className="grid h-24 w-full place-items-center rounded-lg bg-ice px-2">
                {column.src ? (
                  <ContentImage src={column.src} alt={column.label} className="max-h-20 w-auto max-w-full object-contain" />
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
              </div>
              <span className="truncate text-xs text-muted">{column.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
