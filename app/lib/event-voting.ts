import type { TeamEvent } from "@/app/lib/demo-data";

export function eventVotingDeadline(event: TeamEvent, trainingHours: number, gameHours: number): number | null {
  const hours = event.type === "game" ? gameHours : trainingHours;
  const [year, month, day] = event.date.split("-").map(Number);
  const [hour, minute] = event.start.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour)) return null;
  const start = new Date(year, month - 1, day, hour, minute || 0, 0, 0);
  return start.getTime() - hours * 3_600_000;
}

export function eventHasEnded(event: { date: string; start: string; end?: string }, now = Date.now()): boolean {
  const time = event.end && /^\d{2}:\d{2}$/.test(event.end) ? event.end : event.start;
  const [year, month, day] = event.date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour)) return false;
  return new Date(year, month - 1, day, hour, minute || 0, 0, 0).getTime() <= now;
}

export function eventVotingOpen(event: TeamEvent, trainingHours: number, gameHours: number, now = Date.now()): boolean {
  const deadline = eventVotingDeadline(event, trainingHours, gameHours);
  if (deadline == null) return true;
  return now < deadline;
}

export function eventAudienceIncludes(event: TeamEvent, member: { subteamId: string; subteamIds?: string[] }): boolean {
  if (!event.subteamId) return true;
  if (member.subteamId === event.subteamId) return true;
  return (member.subteamIds ?? []).includes(event.subteamId);
}

export function voteRemainingParts(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}
