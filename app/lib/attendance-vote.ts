import type { SupabaseClient } from "@supabase/supabase-js";
import type { BalanceEntry, TeamEvent } from "@/app/lib/demo-data";
import { eventVotingOpen } from "@/app/lib/event-voting";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import type { MessageKey } from "@/app/lib/messages";
import { listEnabledFrontendModuleKeys } from "@/app/lib/site-admin/repository";
import { DEFAULT_GAME_VOTING_HOURS, DEFAULT_TRAINING_VOTING_HOURS } from "@/app/lib/team-defaults";

type VoteStatus = "going" | "absent" | "pending";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function castMemberVote(
  client: SupabaseClient,
  input: {
    teamId: string;
    eventId: string;
    userId: string;
    status: VoteStatus;
    actorId: string;
    enforceDeadline: boolean;
  },
): Promise<{ ok: true; memberBalance: number; ledger: BalanceEntry[]; teamBalance: number; reservation: { eventId: string; userId: string; amount: number } | null } | { ok: false; error: MessageKey }> {
  if (input.status !== "going" && input.status !== "absent" && input.status !== "pending") return { ok: false, error: "auth.error.generic" };
  const team = await client.from("teams").select("training_voting_hours, game_voting_hours, balance").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data) return { ok: false, error: "auth.error.generic" };
  const target = await client.from("team_members").select("user_id, fee_exempt").eq("team_id", input.teamId).eq("user_id", input.userId).maybeSingle();
  if (target.error || !target.data) return { ok: false, error: "auth.error.generic" };
  const event = await client.from("team_events").select("id, event_date, start_time, event_type, venue_id").eq("id", input.eventId).eq("team_id", input.teamId).maybeSingle();
  if (event.error || !event.data) return { ok: false, error: "auth.error.generic" };
  const votingEvent: TeamEvent = {
    id: event.data.id,
    date: event.data.event_date,
    start: String(event.data.start_time).slice(0, 5),
    end: "",
    type: event.data.event_type === "game" ? "game" : "training",
    titleId: "",
    subteamId: "",
    venueId: event.data.venue_id,
  };
  if (input.enforceDeadline && !eventVotingOpen(votingEvent, team.data.training_voting_hours ?? DEFAULT_TRAINING_VOTING_HOURS, team.data.game_voting_hours ?? DEFAULT_GAME_VOTING_HOURS)) {
    return { ok: false, error: "event.vote.closed" };
  }
  const existing = await client.from("team_event_rsvps").select("status").eq("event_id", input.eventId).eq("user_id", input.userId).maybeSingle();
  if (existing.error) return { ok: false, error: "auth.error.generic" };
  const previous = existing.data?.status === "going" || existing.data?.status === "absent" ? existing.data.status : "pending";
  if (previous !== input.status) {
    if (input.status === "pending") {
      const cleared = await client.from("team_event_rsvps").delete().eq("event_id", input.eventId).eq("user_id", input.userId);
      if (cleared.error) return { ok: false, error: "auth.error.generic" };
    } else {
      const saved = await client.from("team_event_rsvps").upsert({
        event_id: input.eventId,
        team_id: input.teamId,
        user_id: input.userId,
        status: input.status,
        updated_at: new Date().toISOString(),
      });
      if (saved.error) return { ok: false, error: "auth.error.generic" };
    }
  }
  const wasGoing = previous === "going";
  const nowGoing = input.status === "going";
  let teamBalance = roundMoney(Number(team.data.balance ?? 0));
  async function revertRsvp() {
    if (previous === "pending") await client.from("team_event_rsvps").delete().eq("event_id", input.eventId).eq("user_id", input.userId);
    else await client.from("team_event_rsvps").upsert({ event_id: input.eventId, team_id: input.teamId, user_id: input.userId, status: previous, updated_at: new Date().toISOString() });
  }
  if (wasGoing !== nowGoing) {
    const flag = await client.from("cron_jobs").select("enabled").eq("job_key", "finance").maybeSingle();
    const reserve = flag.data?.enabled === true;
    if (nowGoing) {
      const modules = await listEnabledFrontendModuleKeys();
      const sportFinance = await client.from("teams").select("sport_id").eq("id", input.teamId).maybeSingle();
      const sportId = typeof sportFinance.data?.sport_id === "string" ? sportFinance.data.sport_id : null;
      let sportAllowsFinance = true;
      if (sportId) {
        const link = await client.from("sport_modules").select("module_key").eq("sport_id", sportId).eq("module_key", FRONTEND_MODULE_KEYS.finance).maybeSingle();
        if (!link.error) sportAllowsFinance = Boolean(link.data);
      }
      const finance = modules.includes(FRONTEND_MODULE_KEYS.finance) && sportAllowsFinance;
      let price = 0;
      if (finance && target.data.fee_exempt !== true) {
        const venue = await client.from("venues").select("price_per_hour").eq("id", event.data.venue_id).maybeSingle();
        const raw = Number(venue.data?.price_per_hour ?? 0);
        if (Number.isFinite(raw) && raw > 0) price = roundMoney(raw);
      }
      if (price > 0 && reserve) {
        const held = await client.from("finance_reservations").upsert(
          { team_id: input.teamId, user_id: input.userId, event_id: input.eventId, amount: price },
          { onConflict: "event_id,user_id" },
        );
        if (held.error) {
          await revertRsvp();
          return { ok: false, error: "auth.error.generic" };
        }
      } else if (price > 0) {
        await client.from("finance_reservations").delete().eq("event_id", input.eventId).eq("user_id", input.userId);
        const inserted = await client.from("balance_entries").insert({
          team_id: input.teamId,
          user_id: input.userId,
          amount: -price,
          kind: "event",
          event_id: input.eventId,
          created_by: input.actorId,
        });
        if (inserted.error) {
          await revertRsvp();
          return { ok: false, error: "auth.error.generic" };
        }
        const bumped = await client.rpc("adjust_team_balance", { target: input.teamId, delta: price });
        if (bumped.error || bumped.data == null) {
          await client.from("balance_entries").delete().eq("event_id", input.eventId).eq("user_id", input.userId).eq("kind", "event");
          await revertRsvp();
          return { ok: false, error: "auth.error.generic" };
        }
        teamBalance = roundMoney(Number(bumped.data));
      }
    } else {
      const cleared = await client.from("finance_reservations").delete().eq("event_id", input.eventId).eq("user_id", input.userId);
      if (cleared.error) {
        await revertRsvp();
        return { ok: false, error: "auth.error.generic" };
      }
      const removed = await client.from("balance_entries").delete().eq("event_id", input.eventId).eq("user_id", input.userId).eq("kind", "event").select("amount");
      if (removed.error) return { ok: false, error: "auth.error.generic" };
      const taken = (removed.data ?? []).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
      if (taken > 0) {
        const bumped = await client.rpc("adjust_team_balance", { target: input.teamId, delta: -taken });
        if (bumped.error || bumped.data == null) {
          await client.from("balance_entries").insert(
            (removed.data ?? []).map((row) => ({
              team_id: input.teamId,
              user_id: input.userId,
              amount: row.amount,
              kind: "event",
              event_id: input.eventId,
              created_by: input.actorId,
            })),
          );
          await revertRsvp();
          return { ok: false, error: "auth.error.generic" };
        }
        teamBalance = roundMoney(Number(bumped.data));
      }
    }
  }
  const rows = await client.from("balance_entries").select("id, amount, created_at").eq("team_id", input.teamId).eq("user_id", input.userId).order("created_at", { ascending: false });
  if (rows.error || !rows.data) return { ok: false, error: "auth.error.generic" };
  const ledger = rows.data.map((row) => ({ id: row.id, amount: Number(row.amount), at: toLocalDateTimeStamp(row.created_at) }));
  const memberBalance = roundMoney(ledger.reduce((sum, item) => sum + item.amount, 0));
  const hold = await client.from("finance_reservations").select("amount").eq("event_id", input.eventId).eq("user_id", input.userId).maybeSingle();
  const reservation = !hold.error && hold.data ? { eventId: input.eventId, userId: input.userId, amount: roundMoney(Number(hold.data.amount)) } : null;
  return { ok: true, memberBalance, ledger, teamBalance, reservation };
}
