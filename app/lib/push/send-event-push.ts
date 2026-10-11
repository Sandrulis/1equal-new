import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";
import type { TeamEvent } from "@/app/lib/demo-data";
import { eventHref } from "@/app/lib/dashboard-path";
import { formatClock, formatDisplayDate } from "@/app/lib/format";
import { translate, type Lang } from "@/app/lib/messages";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";

const CHANNEL_ID = "events";
const STALE_TOKEN = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

function personLang(code: string | null | undefined, fallback: Lang): Lang {
  if (code === "en" || code === "ru" || code === "lv") return code;
  return fallback;
}

function serviceAccount(): ServiceAccount | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE?.trim();
  try {
    const raw = inline?.startsWith("{") ? inline : file ? readFileSync(file, "utf8") : "";
    if (!raw.trim().startsWith("{")) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ServiceAccount;
  } catch {
    return null;
  }
}

function messagingOrNull() {
  try {
    const account = serviceAccount();
    if (!account) return null;
    if (!getApps().length) initializeApp({ credential: cert(account) });
    return getMessaging();
  } catch {
    console.error("push setup failed");
    return null;
  }
}

export async function sendNewEventPush(event: TeamEvent, teamId: string, skipUserId: string): Promise<void> {
  try {
    const messaging = messagingOrNull();
    const client = createAdminClient();
    if (!messaging || !client) return;

    const members = await client.from("team_members").select("user_id").eq("team_id", teamId);
    if (members.error || !members.data?.length) return;
    let userIds = members.data.map((row) => row.user_id).filter((id) => id !== skipUserId);
    if (event.subteamId) {
      const grouped = await client.from("team_member_subteams").select("user_id").eq("team_id", teamId).eq("subteam_id", event.subteamId);
      if (grouped.error) return;
      const allowedIds = new Set((grouped.data ?? []).map((row) => row.user_id));
      userIds = userIds.filter((id) => allowedIds.has(id));
    }
    if (!userIds.length) return;

    const [people, devices, team, language, brand] = await Promise.all([
      client.from("users").select("id, language_code, event_emails, deletion_due_at").in("id", userIds),
      client.from("push_devices").select("token, user_id").in("user_id", userIds),
      client.from("teams").select("name").eq("id", teamId).maybeSingle(),
      client.from("site_languages").select("code").eq("is_default", true).maybeSingle(),
      getSiteBrand(),
    ]);
    if (people.error || !people.data || devices.error || !devices.data?.length || !team.data) return;

    const fallback = personLang(language.data?.code, "lv");
    const langs = new Map<string, Lang>();
    for (const person of people.data) {
      if (person.event_emails === false || person.deletion_due_at) continue;
      langs.set(person.id, personLang(person.language_code, fallback));
    }

    const path = eventHref("/dashboard", event.id);
    const title = team.data.name?.trim() || brand.name;
    const pending: { token: string; message: Message }[] = [];
    for (const device of devices.data) {
      if (typeof device.token !== "string") continue;
      const lang = langs.get(device.user_id);
      if (!lang) continue;
      const typeKey = event.type === "game" ? "legend.game" : "legend.training";
      pending.push({
        token: device.token,
        message: {
          token: device.token,
          notification: {
            title,
            body: translate(lang, "push.event.body", {
              type: translate(lang, typeKey),
              date: formatDisplayDate(event.date, brand.display),
              time: formatClock(event.start, brand.display.timeFormat),
            }),
          },
          data: { path },
          android: {
            priority: "high",
            notification: { channelId: CHANNEL_ID, sound: "default" },
          },
        },
      });
    }
    if (!pending.length) return;

    const stale: string[] = [];
    for (let offset = 0; offset < pending.length; offset += 500) {
      const slice = pending.slice(offset, offset + 500);
      const result = await messaging.sendEach(slice.map((item) => item.message));
      result.responses.forEach((item, index) => {
        const token = slice[index]?.token;
        if (token && item.error && STALE_TOKEN.has(item.error.code)) stale.push(token);
      });
      if (result.failureCount) console.error("event push failed", result.failureCount);
    }
    if (stale.length) await client.from("push_devices").delete().in("token", stale);
  } catch {
    console.error("event push failed");
  }
}
