"use client";

import { useEffect, useRef, useState } from "react";
import { ContentImage } from "@/app/components/content-image";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { parseEhlPlayerUrl, type EhlPlayerProfile, type EhlStatBlock } from "@/app/lib/ehl-player";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { lookupPlayerLink } from "@/app/lib/team-actions";

const blockClass = "flex w-[8.5rem] shrink-0 flex-col justify-center rounded-lg bg-ice px-2.5 py-1.5";

function StatTiles({ label, columns, values }: { label: string; columns: string[]; values: Record<string, string> }) {
  const shown = columns.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((column) => (
          <li key={column} className={`${blockClass} items-center text-center`}>
            <span className="text-[10px] leading-none text-muted">{column}</span>
            <span className="mt-1 text-sm leading-none font-semibold tabular-nums">{values[column] || "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GameTable({ title, block }: { title: string; block: EhlStatBlock | null | undefined }) {
  const { t } = useLanguage();
  const games = block?.games ?? [];
  if (!games.length) return null;
  const columns = block?.columns.filter(Boolean) ?? [];
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
        {block?.label ? <p className="text-xs text-muted">{block.label}</p> : null}
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-[10px] tracking-wide text-muted uppercase">
              <th className="px-2 py-1.5 font-medium">{t("legend.game")}</th>
              <th className="px-2 py-1.5 font-medium">{t("player.date")}</th>
              {columns.map((column) => (
                <th key={column} className="px-2 py-1.5 text-center font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={`${game.date}-${game.match}`} className="border-t border-line">
                <td className="border-t border-line px-2 py-1.5 font-medium whitespace-nowrap" title={game.score ?? undefined}>{game.match}</td>
                <td className="border-t border-line px-2 py-1.5 whitespace-nowrap text-muted">{game.date}</td>
                {columns.map((column) => (
                  <td key={column} className="border-t border-line px-2 py-1.5 text-center tabular-nums">{game.stats[column] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function sameEhlPlayer(source: string, player: EhlPlayerProfile | null): player is EhlPlayerProfile {
  if (!player) return false;
  const left = parseEhlPlayerUrl(source)?.toString();
  const right = parseEhlPlayerUrl(player.sourceUrl)?.toString();
  return Boolean(left && left === right);
}

export function EhlPlayerColumns({ profile, showName = false }: { profile: EhlPlayerProfile; showName?: boolean }) {
  const { t } = useLanguage();
  const photoRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [openFor, setOpenFor] = useState(profile.sourceUrl);
  const [open, setOpen] = useState(false);
  const [clip, setClip] = useState(0);
  const [overflows, setOverflows] = useState(false);
  if (openFor !== profile.sourceUrl) {
    setOpenFor(profile.sourceUrl);
    setOpen(false);
  }
  const season = profile.season;
  const stats = season ? season.columns.filter(Boolean) : [];
  const facts = [
    ["player.ehl.height", profile.height],
    ["player.ehl.weight", profile.weight],
    ["player.ehl.stick", profile.stick],
    ["player.ehl.birth", profile.birthDate],
    ["player.ehl.country", profile.country],
  ].filter((item): item is [MessageKey, string] => Boolean(item[1]));
  const clipped = overflows && !open && clip > 0;

  useEffect(() => {
    const photo = photoRef.current;
    const body = bodyRef.current;
    if (!photo || !body) return;
    const measure = () => {
      const root = body.getBoundingClientRect();
      const box = photo.getBoundingClientRect();
      const limit = Math.max(0, Math.round(box.bottom - root.top));
      setClip(limit);
      setOverflows(limit > 0 && body.scrollHeight > limit + 8);
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(photo);
    observer.observe(body);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [profile.sourceUrl, profile.photoUrl, open]);

  return (
    <div className="relative">
    <div
      ref={bodyRef}
      className={clipped ? "overflow-hidden" : overflows ? "pb-8" : undefined}
      style={clipped ? { maxHeight: clip, maskImage: "linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent)" } : undefined}
    >
    <div className="grid grid-cols-[20%_minmax(0,1fr)] items-start gap-3">
      <div ref={photoRef} className="overflow-hidden rounded-xl bg-ice">
        {profile.photoUrl ? (
          <ContentImage src={profile.photoUrl} alt={profile.name} width={210} height={280} className="aspect-[3/4] w-full object-contain object-top" />
        ) : (
          <span className="grid aspect-[3/4] w-full place-items-center text-sm text-muted">—</span>
        )}
      </div>
      <div className="min-w-0">
        {showName ? <p className="font-semibold">{profile.name}</p> : null}
        {showName && profile.team ? <p className="text-sm text-muted">{profile.team}</p> : null}
        {season && stats.length ? (
          <div className={showName ? "mt-3" : ""}>
            <StatTiles label={season.label || t("player.ehl.season")} columns={stats} values={season.results} />
          </div>
        ) : null}
        {season && stats.some((column) => season.ranking[column]) ? (
          <div className="mt-3">
            <StatTiles label={t("player.ehl.ranking")} columns={stats} values={season.ranking} />
          </div>
        ) : null}
        {facts.length ? (
          <dl className="mt-3 flex flex-wrap gap-1.5">
            {facts.map(([key, value]) => (
              <div key={key} className={blockClass}>
                <dt className="text-[10px] leading-none font-medium tracking-wide whitespace-nowrap text-muted uppercase">{t(key)}</dt>
                <dd className="mt-1 text-sm leading-none font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
    <GameTable title={t("player.ehl.regular")} block={profile.regularSeason} />
    <GameTable title={t("player.ehl.playoff")} block={profile.playoff} />
    </div>
    {overflows ? (
      <button
        type="button"
        aria-expanded={open}
        aria-label={t(open ? "player.ehl.hide" : "player.ehl.show")}
        onClick={() => setOpen((current) => !current)}
        className="absolute left-1/2 z-10 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-paper text-muted ring-1 ring-line"
        style={{ top: clipped ? Math.max(0, clip - 16) : undefined, bottom: clipped ? undefined : 0 }}
      >
        <ChevronDown open={open} />
      </button>
    ) : null}
  </div>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={open ? "rotate-180" : undefined}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function EhlPlayerLinkPreview({
  value,
  seed = null,
  onResolved,
  onLoading,
}: {
  value: string;
  seed?: EhlPlayerProfile | null;
  onResolved?: (player: EhlPlayerProfile | null) => void;
  onLoading?: (loading: boolean) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const onResolvedRef = useRef(onResolved);
  const onLoadingRef = useRef(onLoading);
  const seedRef = useRef(seed);
  const [player, setPlayer] = useState<EhlPlayerProfile | null>(null);
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
    const parsed = parseEhlPlayerUrl(value);
    if (!parsed) return;
    let cancelled = false;
    const quiet = sameEhlPlayer(value, seedRef.current);
    const timer = window.setTimeout(() => {
      if (!quiet) {
        onLoadingRef.current?.(true);
        showFeedback({ message: t("team.empty.checking"), variant: "info" });
      }
      void lookupPlayerLink(parsed.toString()).then((result) => {
        if (cancelled) return;
        if (!quiet) onLoadingRef.current?.(false);
        if (!result.ok) {
          if (quiet) return;
          setPlayer(null);
          setError({ url: parsed.toString(), key: result.error });
          showFeedback({ message: t(result.error), variant: "error" });
          return;
        }
        setError(null);
        setPlayer(result.profile);
        onResolvedRef.current?.(result.profile);
      });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      onLoadingRef.current?.(false);
    };
  }, [showFeedback, t, value]);

  const parsed = parseEhlPlayerUrl(value);
  const fetched = player && parsed && sameEhlPlayer(value, player) ? player : null;
  const shown = fetched ?? (parsed && sameEhlPlayer(value, seed) ? seed : null);
  const visibleError = error && parsed && error.url === parsed.toString() && !fetched ? error.key : null;

  return (
    <>
      {visibleError ? <p className="mt-2 text-sm text-red-700">{t(visibleError)}</p> : null}
      {shown ? (
        <div className="mt-3">
          <EhlPlayerColumns profile={shown} showName />
        </div>
      ) : null}
    </>
  );
}
