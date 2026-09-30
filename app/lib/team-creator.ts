import { accountName, teamPlayer, type AccountProfile } from "@/app/lib/auth/profile";
import type { Member } from "@/app/lib/demo-data";
import { isoDate, toLocalDateTimeStamp } from "@/app/lib/format";
import { normalizePositionCode } from "@/app/lib/positions";

export function creatorMember(account: AccountProfile, teamCode: string, now = new Date()): Member {
  const player = teamPlayer(account, teamCode);
  const number = Number.parseInt(player?.number ?? "", 10);
  return {
    id: account.id,
    name: player?.name || accountName(account),
    email: account.email,
    phone: "",
    number: Number.isInteger(number) && number >= 0 && number <= 99 ? number : null,
    position: player?.position ?? "",
    role: roleFromPosition(player?.position),
    subteamId: "",
    subteamIds: [],
    feeExempt: false,
    balance: 0,
    joined: isoDate(now),
    updatedAt: toLocalDateTimeStamp(now.toISOString()),
    photoUrl: player?.photoUrl ?? null,
    ehl: player,
  };
}

export function roleFromPosition(position: string | null | undefined): Member["role"] {
  const code = normalizePositionCode(position);
  if (code === "G") return "goalie";
  if (code === "D") return "defender";
  if (code === "LW" || code === "C" || code === "RW") return "forward";
  const value = (position ?? "").toLocaleLowerCase("lv");
  if (value.includes("vārtsarg")) return "goalie";
  if (value.includes("aizsarg")) return "defender";
  if (value.includes("uzbruc")) return "forward";
  return "captain";
}
