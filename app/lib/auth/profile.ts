import type { UserDisplayPreferences } from "@/app/lib/display-preferences";
import type { EhlPlayerProfile } from "@/app/lib/ehl-player";

export type AccountProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  ehlPlayers: Record<string, EhlPlayerProfile>;
  avatarUrl: string | null;
  eventEmails: boolean;
  display: UserDisplayPreferences;
};

export function teamPlayer(account: AccountProfile | null | undefined, teamCode: string | null | undefined): EhlPlayerProfile | null {
  if (!account || !teamCode) return null;
  return account.ehlPlayers[teamCode] ?? null;
}

export function accountName(account: AccountProfile) {
  return [account.firstName, account.lastName].filter(Boolean).join(" ");
}
