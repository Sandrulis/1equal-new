"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ContentImage } from "@/app/components/content-image";
import { memberRsvp, type Rsvp } from "@/app/components/event-details";
import { IconChevronLeft, IconChevronRight, IconX } from "@/app/components/icon-tip-button";
import type { Member, TeamEvent } from "@/app/lib/demo-data";
import { formatJersey } from "@/app/lib/format-jersey";
import { normalizePositionCode, type PositionCode } from "@/app/lib/positions";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { memberFaceUrl } from "@/app/lib/entuziasti-view";
import { useEntuziasti } from "@/app/components/entuziasti-context";
import { useLanguage } from "@/app/lib/language";

export type SlotMap = Record<number, string>;
export type SideMap = Record<string, "black" | "white">;

type ShiftSlot = { code: string; match: PositionCode };

const LINE_SLOTS: ShiftSlot[] = [
  { code: "LW", match: "LW" },
  { code: "C", match: "C" },
  { code: "RW", match: "RW" },
  { code: "LD", match: "D" },
  { code: "RD", match: "D" },
];

const GOAL_SLOT = 16;

const SHIFT_TONE = [
  { ring: "", fill: "" },
  { ring: "ring-[#b4332a]", fill: "bg-[#b4332a]" },
  { ring: "ring-[#2f6fbf]", fill: "bg-[#2f6fbf]" },
  { ring: "ring-[#1f8a4c]", fill: "bg-[#1f8a4c]" },
] as const;
const GOAL_TONE = { ring: "ring-[#d97706]", fill: "bg-[#d97706]" };

const ICE_SPOTS: { shift: number; index: number; x: string; y: string }[] = [
  { shift: 1, index: 0, x: "22%", y: "16%" },
  { shift: 1, index: 1, x: "50%", y: "12%" },
  { shift: 1, index: 2, x: "78%", y: "16%" },
  { shift: 1, index: 3, x: "35%", y: "27%" },
  { shift: 1, index: 4, x: "65%", y: "27%" },
  { shift: 2, index: 0, x: "18%", y: "40%" },
  { shift: 2, index: 1, x: "50%", y: "40%" },
  { shift: 2, index: 2, x: "82%", y: "40%" },
  { shift: 2, index: 3, x: "34%", y: "51%" },
  { shift: 2, index: 4, x: "66%", y: "51%" },
  { shift: 3, index: 0, x: "28%", y: "63%" },
  { shift: 3, index: 1, x: "50%", y: "66%" },
  { shift: 3, index: 2, x: "72%", y: "63%" },
  { shift: 3, index: 3, x: "30%", y: "77%" },
  { shift: 3, index: 4, x: "70%", y: "77%" },
];

function shiftSlotId(shift: number, index: number): number {
  return (shift - 1) * LINE_SLOTS.length + index + 1;
}

function goingMembers(event: TeamEvent, members: Member[], rsvp: Record<string, Rsvp> | undefined, knownRsvp: boolean): Member[] {
  return members.filter((member, index) => memberRsvp(event.id, member.id, index, rsvp, knownRsvp) === "going");
}

function slotKey(map: SlotMap): string {
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((slot) => `${slot}:${map[slot] ?? ""}`)
    .join("|");
}

function sideKey(map: SideMap): string {
  return Object.keys(map)
    .sort()
    .map((id) => `${id}:${map[id]}`)
    .join("|");
}

function keepSaved<T>(saved: T, value: T, keyOf: (item: T) => string, baseline: string, setBaseline: (key: string) => void, setValue: (item: T) => void) {
  const incoming = keyOf(saved);
  const local = keyOf(value);
  if (incoming === baseline || (local !== baseline && local !== incoming)) return;
  setBaseline(incoming);
  if (local !== incoming) setValue(saved);
}

function pruneSlots(map: SlotMap, going: Member[]): SlotMap {
  const ids = new Set(going.map((member) => member.id));
  const next: SlotMap = {};
  for (const [slot, memberId] of Object.entries(map)) {
    if (ids.has(memberId)) next[Number(slot)] = memberId;
  }
  return next;
}

function pruneSides(map: SideMap, going: Member[]): SideMap {
  const ids = new Set(going.map((member) => member.id));
  const next: SideMap = {};
  for (const [memberId, side] of Object.entries(map)) {
    if (ids.has(memberId)) next[memberId] = side;
  }
  return next;
}

export function EventLineup({
  event,
  members,
  venueName,
  subteamName,
  knownRsvp = false,
  rsvp,
  savedSlots,
  savedSides,
  onSaveSlots,
  onSaveSides,
  onBack,
  onUnsaved,
  editable = false,
}: {
  event: TeamEvent;
  members: Member[];
  venueName: string;
  subteamName: string;
  knownRsvp?: boolean;
  rsvp: Record<string, Rsvp> | undefined;
  savedSlots: SlotMap;
  savedSides: SideMap;
  onSaveSlots: (slots: SlotMap) => boolean | Promise<boolean>;
  onSaveSides: (sides: SideMap) => boolean | Promise<boolean>;
  onBack: () => void;
  onUnsaved?: (unsaved: boolean) => void;
  editable?: boolean;
}) {
  const going = useMemo(() => goingMembers(event, members, rsvp, knownRsvp), [event, members, rsvp, knownRsvp]);
  if (event.type === "game") {
    return (
      <GameLineup
        event={event}
        going={going}
        venueName={venueName}
        subteamName={subteamName}
        saved={pruneSlots(savedSlots, going)}
        onSave={onSaveSlots}
        onBack={onBack}
        onUnsaved={onUnsaved}
        editable={editable}
      />
    );
  }
  return (
    <TrainingLineup
      going={going}
      saved={pruneSides(savedSides, going)}
      onSave={onSaveSides}
      onBack={onBack}
      onUnsaved={onUnsaved}
      editable={editable}
    />
  );
}

function useLiveSave<T>(value: T, key: string, enabled: boolean, save: (value: T) => boolean | Promise<boolean>, onUnsaved?: (unsaved: boolean) => void) {
  const [acked, setAcked] = useState(key);
  const saveRef = useRef(save);
  const valueRef = useRef(value);
  const reportRef = useRef(onUnsaved);
  const keyRef = useRef(key);
  const running = useRef(false);
  const again = useRef(false);
  const pumpRef = useRef<() => void>(() => {});
  useEffect(() => {
    saveRef.current = save;
    valueRef.current = value;
    reportRef.current = onUnsaved;
    keyRef.current = key;
    pumpRef.current = () => {
      if (running.current) {
        again.current = true;
        return;
      }
      running.current = true;
      again.current = false;
      const snapshot = keyRef.current;
      void Promise.resolve(saveRef.current(valueRef.current)).then(
        (ok) => {
          running.current = false;
          const moved = keyRef.current !== snapshot;
          if (ok !== false && !moved) setAcked(snapshot);
          if (moved || again.current) pumpRef.current();
        },
        () => {
          running.current = false;
          if (keyRef.current !== snapshot || again.current) pumpRef.current();
        },
      );
    };
  });
  const unsaved = enabled && key !== acked;

  useEffect(() => {
    reportRef.current?.(unsaved);
  }, [unsaved]);

  useEffect(() => () => reportRef.current?.(false), []);

  useEffect(() => {
    if (!unsaved) return;
    const timer = window.setTimeout(() => pumpRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [key, unsaved]);

  useEffect(() => {
    if (!unsaved) return;
    function onLeave(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [unsaved]);
}

function playsPosition(member: Member, code: PositionCode): boolean {
  if (normalizePositionCode(member.position) === code) return true;
  return (member.extraPositions ?? []).some((item) => normalizePositionCode(item) === code);
}

function matchesQuery(member: Member, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("lv");
  if (!needle) return true;
  const name = memberName(member).toLocaleLowerCase("lv");
  const number = member.number == null ? "" : String(member.number);
  return name.includes(needle) || number.includes(needle);
}

function GameLineup({
  event,
  going,
  venueName,
  subteamName,
  saved,
  onSave,
  onBack,
  onUnsaved,
  editable,
}: {
  event: TeamEvent;
  going: Member[];
  venueName: string;
  subteamName: string;
  saved: SlotMap;
  onSave: (slots: SlotMap) => boolean | Promise<boolean>;
  onBack: () => void;
  onUnsaved?: (unsaved: boolean) => void;
  editable: boolean;
}) {
  const { t } = useLanguage();
  const { formatDate, formatTime } = useDisplayFormat();
  const [slots, setSlots] = useState<SlotMap>(saved);
  const [slotBaseline, setSlotBaseline] = useState(() => slotKey(saved));
  keepSaved(saved, slots, slotKey, slotBaseline, setSlotBaseline, setSlots);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const byId = new Map(going.map((member) => [member.id, member]));
  useLiveSave(slots, slotKey(slots), editable, onSave, onUnsaved);

  useEffect(() => {
    if (openSlot == null) return;
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-lineup-slot]")) return;
      if (menuRef.current?.contains(target)) return;
      setOpenSlot(null);
      setQuery("");
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenSlot(null);
      setQuery("");
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openSlot]);

  function assign(slot: number, memberId: string) {
    setSlots((map) => {
      const next = { ...map };
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === memberId) delete next[Number(key)];
      }
      next[slot] = memberId;
      return next;
    });
    setOpenSlot(null);
    setQuery("");
  }

  function clearSlot(slot: number) {
    setSlots((map) => {
      if (!map[slot]) return map;
      const next = { ...map };
      delete next[slot];
      return next;
    });
  }

  function toggle(slot: number) {
    setQuery("");
    setOpenSlot((current) => (current === slot ? null : slot));
  }

  return (
    <div className="pb-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line">
          <IconChevronLeft />
          {t("lineup.back")}
        </button>
        <div className="min-w-0 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{subteamName}</h1>
          <p className="text-sm text-muted">
            {formatDate(event.date)} {formatTime(event.start)}
          </p>
          <p className="text-sm text-muted">{venueName}</p>
        </div>
        <span className="w-28" />
      </div>

      {going.length === 0 ? <p className="mb-4 text-sm text-muted">{t("lineup.going.empty")}</p> : null}

      <div className="mx-auto w-full max-w-lg">
        <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
          {[1, 2, 3].map((shift) => (
            <span key={shift} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${SHIFT_TONE[shift].fill}`} />
              {t("lineup.shift", { n: shift })}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${GOAL_TONE.fill}`} />
            {t("position.g")}
          </span>
        </div>
        <div className="relative">
          <Rink />
          {ICE_SPOTS.map((spot) => {
            const slot = LINE_SLOTS[spot.index];
            const id = shiftSlotId(spot.shift, spot.index);
            const x = Number.parseFloat(spot.x);
            return (
              <div key={id} className={`absolute -translate-x-1/2 -translate-y-1/2 ${openSlot === id ? "z-30" : "z-10"}`} style={{ left: spot.x, top: spot.y }}>
                <PositionPick
                  slot={id}
                  code={slot.code}
                  match={slot.match}
                  align={x > 65 ? "right" : x < 35 ? "left" : "center"}
                  ring={SHIFT_TONE[spot.shift].ring}
                  fill={SHIFT_TONE[spot.shift].fill}
                  compact
                  member={byId.get(slots[id] ?? "")}
                  going={going}
                  query={query}
                  open={editable && openSlot === id}
                  editable={editable}
                  menuRef={openSlot === id ? menuRef : undefined}
                  onQuery={setQuery}
                  onToggle={() => toggle(id)}
                  onClear={() => clearSlot(id)}
                  onPick={(memberId) => assign(id, memberId)}
                />
              </div>
            );
          })}
          <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${openSlot === GOAL_SLOT ? "z-30" : "z-10"}`} style={{ left: "50%", top: "88%" }}>
            <PositionPick
              slot={GOAL_SLOT}
              code="G"
              match="G"
              align="center"
              ring={GOAL_TONE.ring}
              fill={GOAL_TONE.fill}
              compact
              member={byId.get(slots[GOAL_SLOT] ?? "")}
              going={going}
              query={query}
              open={editable && openSlot === GOAL_SLOT}
              editable={editable}
              menuRef={openSlot === GOAL_SLOT ? menuRef : undefined}
              onQuery={setQuery}
              onToggle={() => toggle(GOAL_SLOT)}
              onClear={() => clearSlot(GOAL_SLOT)}
              onPick={(memberId) => assign(GOAL_SLOT, memberId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PositionPick({
  slot,
  code,
  match,
  align,
  ring,
  fill,
  compact = false,
  member,
  going,
  query,
  open,
  editable,
  menuRef,
  onQuery,
  onToggle,
  onClear,
  onPick,
}: {
  slot: number;
  code: string;
  match: PositionCode;
  align: "left" | "center" | "right";
  ring?: string;
  fill?: string;
  compact?: boolean;
  member: Member | undefined;
  going: Member[];
  query: string;
  open: boolean;
  editable: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
  onQuery: (value: string) => void;
  onToggle: () => void;
  onClear: () => void;
  onPick: (memberId: string) => void;
}) {
  const { t } = useLanguage();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [menuPlace, setMenuPlace] = useState({ up: false, max: 320 });
  const name = member ? memberName(member) : "";
  const jersey = member ? formatJersey(member.number) : null;
  const [nameTip, setNameTip] = useState<{ x: number; y: number; below: boolean } | null>(null);

  function placeName(target: HTMLElement) {
    if (!name || open) return;
    const box = target.getBoundingClientRect();
    const below = box.top < 40;
    const x = Math.min(window.innerWidth - 12, Math.max(12, box.left + box.width / 2));
    setNameTip({ x, y: below ? box.bottom + 6 : box.top - 6, below });
  }

  const nameTooltip = name && nameTip
    ? createPortal(
        <span
          role="tooltip"
          style={{ left: nameTip.x, top: nameTip.y, transform: nameTip.below ? "translateX(-50%)" : "translate(-50%, -100%)" }}
          className="pointer-events-none fixed z-[70] rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
        >
          {name}
        </span>,
        document.body,
      )
    : null;
  const face = member ? (
    <span className="text-[10px] font-semibold tabular-nums text-white sm:text-xs">{jersey ?? "—"}</span>
  ) : (
    <span className={`font-semibold tracking-wide text-navy ${compact ? "text-[10px]" : "text-sm"}`}>{code}</span>
  );
  const shape = compact
    ? `grid h-9 w-9 place-items-center rounded-full sm:h-11 sm:w-11 ${member ? fill ?? "bg-navy" : `bg-paper ring-2 ${ring ?? "ring-line"}`}`
    : `flex h-16 w-full items-center justify-center rounded-xl bg-paper ring-1 ${open ? "ring-2 ring-navy" : "ring-line"}`;

  useLayoutEffect(() => {
    if (!open) return;
    const node = anchorRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    let limit = window.innerHeight - 8;
    const footer = document.querySelector("footer");
    if (footer) {
      const top = footer.getBoundingClientRect().top;
      if (top > box.bottom) limit = Math.min(limit, top - 8);
    }
    for (const el of document.querySelectorAll("aside")) {
      if (getComputedStyle(el).position !== "fixed") continue;
      const rect = el.getBoundingClientRect();
      if (rect.top > box.bottom && rect.height > 20) limit = Math.min(limit, rect.top - 8);
    }
    const below = limit - box.bottom;
    const above = Math.max(0, box.top - 8);
    const up = below < 280 && above > below;
    const room = up ? above : below;
    setMenuPlace({ up, max: Math.max(160, Math.min(320, room)) });
  }, [open]);
  if (!editable) {
    return (
      <>
        <div
          aria-label={member ? `${code} ${name}` : code}
          onMouseEnter={(event) => placeName(event.currentTarget)}
          onMouseLeave={() => setNameTip(null)}
          className={shape}
        >
          {face}
        </div>
        {nameTooltip}
      </>
    );
  }
  const pool = going.filter((item) => item.id !== member?.id && matchesQuery(item, query));
  const recommended = pool.filter((item) => playsPosition(item, match)).sort(byPlayerName);
  const others = pool.filter((item) => !playsPosition(item, match)).sort(byPlayerName);
  const menuAlign = align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";

  return (
    <>
    <div ref={anchorRef} className={open ? "relative z-20" : "relative"}>
      <button
        type="button"
        data-lineup-slot={slot}
        aria-expanded={open}
        aria-label={member ? `${code} ${name}` : code}
        onClick={() => {
          setNameTip(null);
          onToggle();
        }}
        onMouseEnter={(event) => placeName(event.currentTarget)}
        onMouseLeave={() => setNameTip(null)}
        onFocus={(event) => placeName(event.currentTarget)}
        onBlur={() => setNameTip(null)}
        className={`${shape} ${open ? "outline outline-2 outline-offset-2 outline-navy" : ""}`}
      >
        {face}
      </button>
      {member ? (
        <button
          type="button"
          aria-label={t("lineup.clear")}
          title={t("lineup.clear")}
          onClick={onClear}
          className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-paper text-ink ring-1 ring-line [&_svg]:h-3 [&_svg]:w-3"
        >
          <IconX />
        </button>
      ) : null}
      {open ? (
        <div
          ref={menuRef}
          className={`absolute z-30 w-64 rounded-xl bg-paper p-2 shadow-lg ring-1 ring-line ${menuPlace.up ? "bottom-full mb-1" : "top-full mt-1"} ${menuAlign}`}
        >
          <input
            type="search"
            value={query}
            autoFocus
            placeholder={t("lineup.search")}
            aria-label={t("lineup.search")}
            onChange={(event) => onQuery(event.target.value)}
            className="mb-2 w-full rounded-lg bg-ice px-3 py-2 text-sm text-ink ring-1 ring-line outline-none focus:ring-navy"
          />
          <div className="overflow-y-auto" style={{ maxHeight: Math.max(96, menuPlace.max - 64) }}>
            {recommended.length > 0 ? <p className="px-2 py-1 text-xs font-semibold text-muted">{t("lineup.recommended")}</p> : null}
            {recommended.map((item) => (
              <PlayerOption key={item.id} member={item} onPick={() => onPick(item.id)} />
            ))}
            {others.length > 0 ? <p className="px-2 py-1 text-xs font-semibold text-muted">{t("lineup.others")}</p> : null}
            {others.map((item) => (
              <PlayerOption key={item.id} member={item} onPick={() => onPick(item.id)} />
            ))}
            {recommended.length === 0 && others.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted">{going.length === 0 ? t("lineup.going.empty") : t("lineup.search.empty")}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
    {nameTooltip}
    </>
  );
}

function PlayerOption({ member, onPick }: { member: Member; onPick: () => void }) {
  const name = memberName(member);
  const jersey = formatJersey(member.number);
  return (
    <button type="button" onClick={onPick} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-ice">
      <PlayerFace member={member} compact />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm">{name}</span>
        {jersey ? <span className="block truncate text-xs text-muted tabular-nums">{jersey}</span> : null}
      </span>
    </button>
  );
}

function byPlayerName(left: Member, right: Member): number {
  return memberName(left).localeCompare(memberName(right), "lv");
}

function Rink() {
  return <Image src="/hockey-rink.png" alt="" width={480} height={500} sizes="(max-width: 768px) 100vw, 480px" className="block h-auto w-full" />;
}

type LineSide = "black" | "white" | "pool";

function TrainingLineup({
  going,
  saved,
  onSave,
  onBack,
  onUnsaved,
  editable,
}: {
  going: Member[];
  saved: SideMap;
  onSave: (sides: SideMap) => boolean | Promise<boolean>;
  onBack: () => void;
  onUnsaved?: (unsaved: boolean) => void;
  editable: boolean;
}) {
  const { t } = useLanguage();
  const [sides, setSides] = useState<SideMap>(saved);
  const [sideBaseline, setSideBaseline] = useState(() => sideKey(saved));
  keepSaved(saved, sides, sideKey, sideBaseline, setSideBaseline, setSides);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const [over, setOver] = useState<LineSide | null>(null);
  useLiveSave(sides, sideKey(sides), editable, onSave, onUnsaved);
  const black = going.filter((member) => sides[member.id] === "black");
  const white = going.filter((member) => sides[member.id] === "white");
  const pool = going.filter((member) => !sides[member.id]);

  function move(memberId: string, side: LineSide) {
    setSides((current) => {
      const next = { ...current };
      if (side === "pool") delete next[memberId];
      else next[memberId] = side;
      return next;
    });
  }

  function beginDrag(id: string) {
    dragRef.current = id;
    window.requestAnimationFrame(() => {
      if (dragRef.current === id) setDragId(id);
    });
  }

  function endDrag() {
    dragRef.current = null;
    setDragId(null);
    setOver(null);
  }

  function dropOn(id: string, side: LineSide) {
    const memberId = id || dragRef.current;
    if (memberId) move(memberId, side);
    endDrag();
  }

  return (
    <div className="pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line">
          <IconChevronLeft />
          {t("lineup.back")}
        </button>
      </div>
      <div className="grid items-stretch gap-3 lg:grid-cols-3">
        <LineupColumn
          side="black"
          title={t("lineup.black")}
          count={black.length}
          members={black}
          hot={over === "black"}
          dragId={dragId}
          editable={editable}
          onAssign={move}
          onHot={setOver}
          onDragStart={beginDrag}
          onDragEnd={endDrag}
          onDropMember={dropOn}
        />
        <LineupColumn
          side="pool"
          title={t("lineup.going")}
          count={pool.length}
          members={pool}
          empty={going.length === 0 ? t("lineup.going.empty") : t("lineup.going.assigned")}
          hot={over === "pool"}
          dragId={dragId}
          editable={editable}
          onAssign={move}
          onHot={setOver}
          onDragStart={beginDrag}
          onDragEnd={endDrag}
          onDropMember={dropOn}
        />
        <LineupColumn
          side="white"
          title={t("lineup.white")}
          count={white.length}
          members={white}
          hot={over === "white"}
          dragId={dragId}
          editable={editable}
          onAssign={move}
          onHot={setOver}
          onDragStart={beginDrag}
          onDragEnd={endDrag}
          onDropMember={dropOn}
        />
      </div>
    </div>
  );
}

function columnClass(side: LineSide, hot: boolean): string {
  const base = "flex min-h-80 min-w-0 flex-col rounded-2xl p-4 lg:min-h-[32rem]";
  if (side === "black") return `${base} bg-navy text-white ${hot ? "ring-2 ring-white" : ""}`;
  if (side === "white") return `${base} bg-paper text-ink ${hot ? "ring-2 ring-navy" : "ring-1 ring-line"}`;
  return `${base} bg-train-soft text-ink ${hot ? "ring-2 ring-navy" : "ring-1 ring-train"}`;
}

function LineupColumn({
  side,
  title,
  count,
  members,
  empty,
  hot,
  dragId,
  editable,
  onAssign,
  onHot,
  onDragStart,
  onDragEnd,
  onDropMember,
}: {
  side: LineSide;
  title: string;
  count: number;
  members: Member[];
  empty?: string;
  hot: boolean;
  dragId: string | null;
  editable: boolean;
  onAssign: (id: string, side: LineSide) => void;
  onHot: (side: LineSide | null) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropMember: (id: string, side: LineSide) => void;
}) {
  const countClass =
    side === "black"
      ? "bg-white/15"
      : side === "white"
        ? "bg-ice text-ink"
        : "bg-train text-white";

  return (
    <section
      onDragOver={editable ? (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onHot(side);
      } : undefined}
      onDrop={editable ? (event) => {
        event.preventDefault();
        onDropMember(event.dataTransfer.getData("text/plain"), side);
      } : undefined}
      className={columnClass(side, editable && hot && dragId !== null)}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className={`text-sm font-semibold ${side === "pool" ? "text-train" : ""}`}>{title}</h2>
        <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-semibold ${countClass}`}>{count}</span>
      </header>
      {members.length === 0 ? (
        empty ? <p className="grid flex-1 place-items-center text-center text-sm text-muted">{empty}</p> : <div className="flex-1" />
      ) : (
        <ul className="mt-4 space-y-2">
          {members.map((member) => (
            <PlayerCard
              key={member.id}
              member={member}
              side={side}
              editable={editable}
              dragging={dragId === member.id}
              onAssign={onAssign}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PlayerCard({
  member,
  side,
  editable,
  dragging,
  onAssign,
  onDragStart,
  onDragEnd,
}: {
  member: Member;
  side: LineSide;
  editable: boolean;
  dragging: boolean;
  onAssign: (id: string, side: LineSide) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const { t } = useLanguage();
  const name = memberName(member);
  const jersey = formatJersey(member.number);
  const showLeft = editable && side !== "black";
  const showRight = editable && side !== "white";
  const info = (
    <>
      <PlayerFace member={member} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium">{name}</span>
        {jersey ? <span className="block truncate text-xs text-muted tabular-nums">{jersey}</span> : null}
      </span>
    </>
  );

  return (
    <li className={`flex min-h-12 overflow-hidden rounded-lg bg-paper text-ink ring-1 ring-line ${dragging ? "opacity-40" : ""}`}>
      {showLeft ? (
        <button
          type="button"
          aria-label={t("lineup.toBlack")}
          title={t("lineup.toBlack")}
          onClick={() => onAssign(member.id, "black")}
          className="grid w-12 shrink-0 place-items-center bg-navy text-white hover:opacity-90"
        >
          <span className="pointer-events-none [&_svg]:size-5">
            <IconChevronLeft />
          </span>
        </button>
      ) : null}
      {editable ? (
        <div
          draggable
          title={t("lineup.drag")}
          aria-label={`${jersey ? `${name}, ${jersey}` : name}. ${t("lineup.drag")}`}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", member.id);
            onDragStart(member.id);
          }}
          onDragEnd={onDragEnd}
          className="lineup-drag flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2"
        >
          {info}
          <span className="shrink-0 text-navy">
            <DragGrip />
          </span>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">{info}</div>
      )}
      {showRight ? (
        <button
          type="button"
          aria-label={t("lineup.toWhite")}
          title={t("lineup.toWhite")}
          onClick={() => onAssign(member.id, "white")}
          className="grid w-12 shrink-0 place-items-center border-l border-line bg-ice text-ink hover:bg-paper"
        >
          <span className="pointer-events-none [&_svg]:size-5">
            <IconChevronRight />
          </span>
        </button>
      ) : null}
    </li>
  );
}

function memberName(member: Member): string {
  const parts = [member.firstName?.trim(), member.lastName?.trim()].filter(Boolean);
  return parts.length ? parts.join(" ") : member.name;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function PlayerFace({ member, compact = false }: { member: Member; compact?: boolean }) {
  const photo = memberFaceUrl(member, useEntuziasti());
  const box = compact ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-xs";
  if (photo) {
    return <ContentImage src={photo} alt="" className={`${box} shrink-0 rounded-lg bg-ice object-contain object-center`} />;
  }
  return (
    <span aria-hidden className={`grid ${box} shrink-0 place-items-center rounded-lg bg-navy font-semibold text-white`}>
      {initials(memberName(member))}
    </span>
  );
}

function DragGrip() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="5" cy="3.5" r="1.25" />
      <circle cx="11" cy="3.5" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12.5" r="1.25" />
      <circle cx="11" cy="12.5" r="1.25" />
    </svg>
  );
}
