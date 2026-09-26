"use client";

import { useMemo, useState } from "react";
import { memberRsvp, type Rsvp } from "@/app/components/event-details";
import { IconCheck, IconChevronLeft } from "@/app/components/icon-tip-button";
import { type Member, type TeamEvent } from "@/app/lib/demo-data";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";

export type SlotMap = Record<number, string>;
export type SideMap = Record<string, "black" | "white">;

type Tone = "game" | "mid" | "def" | "goal";

const SLOTS: { n: number; x: number; y: number; tone: Tone }[] = [
  { n: 1, x: 28, y: 14.5, tone: "game" },
  { n: 2, x: 50, y: 14.5, tone: "game" },
  { n: 3, x: 72, y: 14.5, tone: "game" },
  { n: 4, x: 39, y: 28, tone: "game" },
  { n: 5, x: 61, y: 28, tone: "game" },
  { n: 6, x: 28, y: 42, tone: "mid" },
  { n: 7, x: 50, y: 42, tone: "mid" },
  { n: 8, x: 72, y: 42, tone: "mid" },
  { n: 9, x: 39, y: 52, tone: "mid" },
  { n: 10, x: 61, y: 52, tone: "mid" },
  { n: 11, x: 30, y: 68, tone: "def" },
  { n: 12, x: 50, y: 68, tone: "def" },
  { n: 13, x: 70, y: 68, tone: "def" },
  { n: 14, x: 34, y: 76, tone: "def" },
  { n: 15, x: 66, y: 76, tone: "def" },
  { n: 16, x: 50, y: 93, tone: "goal" },
];

const TONE: Record<Tone, { idle: string; filled: string }> = {
  game: {
    idle: "border-game bg-paper text-game",
    filled: "border-game bg-game text-white",
  },
  mid: {
    idle: "border-[#2f6fbf] bg-paper text-[#2f6fbf]",
    filled: "border-[#2f6fbf] bg-[#2f6fbf] text-white",
  },
  def: {
    idle: "border-[#1f8a4c] bg-paper text-[#1f8a4c]",
    filled: "border-[#1f8a4c] bg-[#1f8a4c] text-white",
  },
  goal: {
    idle: "border-[#e07a2f] bg-paper text-[#e07a2f]",
    filled: "border-[#e07a2f] bg-[#e07a2f] text-white",
  },
};

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
}: {
  event: TeamEvent;
  members: Member[];
  venueName: string;
  subteamName: string;
  knownRsvp?: boolean;
  rsvp: Record<string, Rsvp> | undefined;
  savedSlots: SlotMap;
  savedSides: SideMap;
  onSaveSlots: (slots: SlotMap) => void;
  onSaveSides: (sides: SideMap) => void;
  onBack: () => void;
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
      />
    );
  }
  return (
    <TrainingLineup
      going={going}
      saved={pruneSides(savedSides, going)}
      onSave={onSaveSides}
      onBack={onBack}
    />
  );
}

function GameLineup({
  event,
  going,
  venueName,
  subteamName,
  saved,
  onSave,
  onBack,
}: {
  event: TeamEvent;
  going: Member[];
  venueName: string;
  subteamName: string;
  saved: SlotMap;
  onSave: (slots: SlotMap) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const { formatDate, formatTime } = useDisplayFormat();
  const [slots, setSlots] = useState<SlotMap>(saved);
  const [baseline, setBaseline] = useState(slotKey(saved));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dirty = slotKey(slots) !== baseline;
  const placed = new Set(Object.values(slots));
  const waiting = going.filter((member) => !placed.has(member.id));
  const byId = new Map(going.map((member) => [member.id, member]));

  function place(slot: number) {
    if (!selectedId) {
      const current = slots[slot];
      if (!current) return;
      setSlots((map) => {
        const next = { ...map };
        delete next[slot];
        return next;
      });
      setSelectedId(current);
      return;
    }
    setSlots((map) => {
      const next = { ...map };
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === selectedId) delete next[Number(key)];
      }
      next[slot] = selectedId;
      return next;
    });
    setSelectedId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center pb-8">
      <h1 className="text-2xl font-semibold tracking-tight">{subteamName}</h1>
      <p className="mt-1 text-sm text-muted">
        {formatDate(event.date)} {formatTime(event.start)}
      </p>
      <p className="text-sm text-muted">{venueName}</p>

      <p className="mt-4 text-center text-sm text-muted">{t("lineup.pick")}</p>
      <div className="mt-2 flex min-h-9 flex-wrap justify-center gap-2">
        {waiting.map((member) => {
          const active = selectedId === member.id;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedId(active ? null : member.id)}
              className={`rounded-full px-3 py-1 text-sm ring-1 ${
                active ? "bg-navy text-white ring-navy" : "bg-paper text-ink ring-line"
              }`}
            >
              {member.number == null ? member.name : `${member.number} ${member.name}`}
            </button>
          );
        })}
        {going.length === 0 ? <p className="text-sm text-muted">{t("lineup.going.empty")}</p> : null}
      </div>

      <div className="relative mt-3 w-full">
        <Rink />
        {SLOTS.map((slot) => {
          const member = byId.get(slots[slot.n] ?? "");
          const tone = TONE[slot.tone];
          return (
            <button
              key={slot.n}
              type="button"
              title={member ? member.name : String(slot.n)}
              aria-label={member ? `${slot.n} ${member.name}` : String(slot.n)}
              onClick={() => place(slot.n)}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className={`absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-sm font-semibold shadow-sm ${
                member ? tone.filled : tone.idle
              }`}
            >
              {member ? member.number : slot.n}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!dirty}
        onClick={() => {
          onSave(slots);
          setBaseline(slotKey(slots));
        }}
        className={`mt-6 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${
          dirty ? "bg-navy text-white" : "bg-ice text-muted ring-1 ring-line"
        }`}
      >
        <IconCheck />
        {t("lineup.save")}
      </button>
      <button type="button" onClick={onBack} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-paper px-4 py-2 text-sm ring-1 ring-line">
        <IconChevronLeft />
        {t("lineup.back")}
      </button>
    </div>
  );
}

function Rink() {
  return (
    <svg viewBox="0 0 360 480" className="h-auto w-full" aria-hidden>
      <path
        d="M18 14 H342 V368 A162 78 0 0 1 18 368 Z"
        fill="#fbfcfd"
        stroke="#12202b"
        strokeWidth="4"
      />
      <line x1="18" y1="70" x2="342" y2="70" stroke="#b4332a" strokeWidth="3" />
      <path d="M122 108 A58 36 0 0 1 238 108" fill="none" stroke="#2f6fbf" strokeWidth="2.5" />
      <circle cx="42" cy="178" r="4" fill="#b4332a" />
      <circle cx="318" cy="178" r="4" fill="#b4332a" />
      <line x1="18" y1="202" x2="342" y2="202" stroke="#2f6fbf" strokeWidth="4" />
      <circle cx="108" cy="326" r="52" fill="none" stroke="#b4332a" strokeWidth="2" />
      <circle cx="252" cy="326" r="52" fill="none" stroke="#b4332a" strokeWidth="2" />
      <path d="M108 312 V340 M94 326 H122" stroke="#b4332a" strokeWidth="1.5" />
      <path d="M252 312 V340 M238 326 H266" stroke="#b4332a" strokeWidth="1.5" />
      <line x1="120" y1="408" x2="240" y2="408" stroke="#b4332a" strokeWidth="3" />
      <path d="M150 408 A30 26 0 0 1 210 408 Z" fill="#9fd4ea" stroke="#2f6fbf" strokeWidth="2" />
    </svg>
  );
}

function TrainingLineup({
  going,
  saved,
  onSave,
  onBack,
}: {
  going: Member[];
  saved: SideMap;
  onSave: (sides: SideMap) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const [sides, setSides] = useState<SideMap>(saved);
  const [baseline, setBaseline] = useState(sideKey(saved));
  const dirty = sideKey(sides) !== baseline;
  const black = going.filter((member) => sides[member.id] === "black");
  const white = going.filter((member) => sides[member.id] === "white");
  const pool = going.filter((member) => !sides[member.id]);

  function move(memberId: string, side: "black" | "white" | "pool") {
    setSides((current) => {
      const next = { ...current };
      if (side === "pool") delete next[memberId];
      else next[memberId] = side;
      return next;
    });
  }

  return (
    <div className="pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line">
          <IconChevronLeft />
          {t("lineup.back")}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              onSave(sides);
              setBaseline(sideKey(sides));
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              dirty ? "bg-navy text-white" : "bg-ice text-muted ring-1 ring-line"
            }`}
          >
            <IconCheck />
            {t("lineup.save")}
          </button>
        </div>
      </div>
      <div className="grid items-stretch gap-3 lg:grid-cols-3">
        <TeamColumn title={t("lineup.black")} count={black.length} tone="black" members={black} onReturn={(id) => move(id, "pool")} />
        <PoolColumn
          title={t("lineup.going")}
          count={pool.length}
          members={pool}
          empty={going.length === 0 ? t("lineup.going.empty") : t("lineup.going.assigned")}
          onBlack={(id) => move(id, "black")}
          onWhite={(id) => move(id, "white")}
        />
        <TeamColumn title={t("lineup.white")} count={white.length} tone="white" members={white} onReturn={(id) => move(id, "pool")} />
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  count,
  tone,
  members,
  onReturn,
}: {
  title: string;
  count: number;
  tone: "black" | "white";
  members: Member[];
  onReturn: (id: string) => void;
}) {
  const { t } = useLanguage();
  const dark = tone === "black";
  return (
    <section className={`flex min-h-80 flex-col rounded-2xl p-4 lg:min-h-[32rem] ${dark ? "bg-navy text-white" : "bg-paper text-ink ring-1 ring-line"}`}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-semibold ${dark ? "bg-white/15" : "bg-ice"}`}>
          {count}
        </span>
      </header>
      <ul className="mt-4 space-y-2">
        {members.map((member) => (
          <li key={member.id} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${dark ? "bg-white/10" : "bg-ice"}`}>
            <span className="text-sm">
              {member.number == null ? member.name : `${member.number} ${member.name}`}
            </span>
            <button
              type="button"
              onClick={() => onReturn(member.id)}
              className={`rounded-md px-2 py-1 text-xs ${dark ? "bg-white/15" : "bg-paper ring-1 ring-line"}`}
            >
              {t("lineup.return")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PoolColumn({
  title,
  count,
  members,
  empty,
  onBlack,
  onWhite,
}: {
  title: string;
  count: number;
  members: Member[];
  empty: string;
  onBlack: (id: string) => void;
  onWhite: (id: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="flex min-h-80 flex-col rounded-2xl bg-train-soft p-4 ring-1 ring-train lg:min-h-[32rem]">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-train">{title}</h2>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-train px-1.5 text-xs font-semibold text-white">
          {count}
        </span>
      </header>
      {members.length === 0 ? (
        <p className="grid flex-1 place-items-center text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {members.map((member) => (
            <li key={member.id} className="rounded-lg bg-paper px-3 py-2 ring-1 ring-line">
              <p className="text-sm font-medium">
                {member.number == null ? member.name : `${member.number} ${member.name}`}
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onBlack(member.id)} className="rounded-md bg-navy px-2 py-1 text-xs text-white">
                  {t("lineup.toBlack")}
                </button>
                <button type="button" onClick={() => onWhite(member.id)} className="rounded-md bg-paper px-2 py-1 text-xs ring-1 ring-line">
                  {t("lineup.toWhite")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
