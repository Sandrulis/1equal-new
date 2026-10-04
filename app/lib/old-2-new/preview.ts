import { normalizePositionCode } from "@/app/lib/positions";
import type { PingviniData } from "@/app/lib/old-2-new/snapshot";
import type { MovePreview, PreviewBalance, PreviewEvent, PreviewMember, PreviewUser } from "@/app/lib/old-2-new/types";

function personName(first: string, last: string, email: string): string {
  const name = [first, last].map((part) => part.trim()).filter(Boolean).join(" ");
  return name || email;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildPreview(data: PingviniData, existingEmails: Set<string>): MovePreview {
  const names = new Map(data.users.map((user) => [user.id, personName(user.firstName, user.lastName, user.email)]));
  const emails = new Map(data.users.map((user) => [user.id, user.email]));
  const roster = new Set(data.members.map((member) => member.userId));
  const subteamName = new Map(data.subteams.map((item) => [item.id, item.name]));
  const venueName = new Map(data.venues.map((item) => [item.id, item.name]));
  const memberSubteams = new Map<number, string[]>();
  const memberUser = new Map(data.members.map((member) => [member.id, member.userId]));
  for (const link of data.links) {
    const userId = memberUser.get(link.memberId);
    const name = subteamName.get(link.subteamId);
    if (userId == null || !name) continue;
    const list = memberSubteams.get(userId) ?? [];
    if (!list.includes(name)) list.push(name);
    memberSubteams.set(userId, list);
  }

  const users: PreviewUser[] = data.users
    .map((user) => ({
      name: names.get(user.id) ?? user.email,
      email: user.email,
      phone: user.phone,
      login: existingEmails.has(user.email) ? "linked" as const : user.passwordHash ? "password" as const : "reset" as const,
      onRoster: roster.has(user.id),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "lv"));

  const members: PreviewMember[] = data.members
    .map((member) => {
      const position = normalizePositionCode(member.position);
      return {
        name: names.get(member.userId) ?? "",
        email: emails.get(member.userId) ?? "",
        number: member.number,
        clearedNumber: member.clearedNumber,
        position,
        positionFrom: position && position !== member.position.trim().toUpperCase() ? member.position.trim() : "",
        balance: member.balance,
        subteams: (memberSubteams.get(member.userId) ?? []).join(", "),
        hidden: member.hidden,
        feeExempt: member.feeExempt,
        teamAdmin: member.role === 1,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "lv"));

  const votes = new Map<number, { going: number; absent: number }>();
  for (const rsvp of data.rsvps) {
    const row = votes.get(rsvp.eventId) ?? { going: 0, absent: 0 };
    if (rsvp.status === "going") row.going += 1;
    else row.absent += 1;
    votes.set(rsvp.eventId, row);
  }

  const events: PreviewEvent[] = data.events
    .map((event) => {
      const vote = votes.get(event.id) ?? { going: 0, absent: 0 };
      return {
        date: event.date,
        start: event.start,
        type: event.type,
        venue: event.venueId != null ? venueName.get(event.venueId) ?? "" : "",
        subteam: event.subteamId != null ? subteamName.get(event.subteamId) ?? "" : "",
        expense: event.expense,
        expenseWasEmpty: event.expenseWasEmpty,
        withCoach: event.withCoach,
        hidden: event.hidden,
        going: vote.going,
        absent: vote.absent,
        lineup: event.slots.length + event.sides.length,
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date) || right.start.localeCompare(left.start));

  const history = new Map<number, number>();
  const adjustment = new Map<number, number>();
  for (const piece of data.balances) {
    if (piece.changedBy == null) adjustment.set(piece.userId, round2((adjustment.get(piece.userId) ?? 0) + piece.amount));
    else history.set(piece.userId, round2((history.get(piece.userId) ?? 0) + piece.amount));
  }
  const balances: PreviewBalance[] = data.members
    .map((member) => ({
      name: names.get(member.userId) ?? "",
      balance: member.balance,
      history: history.get(member.userId) ?? 0,
      adjustment: adjustment.get(member.userId) ?? 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "lv"));

  return {
    leader: names.get(data.leaderId) ?? "",
    users,
    members,
    subteams: data.subteams.map((item) => ({ name: item.name, color: item.color })),
    venues: [...data.venues].sort((left, right) => left.name.localeCompare(right.name, "lv")).map((item) => ({
      name: item.name,
      price: item.price,
      hidden: item.hidden,
    })),
    events,
    balances,
  };
}
