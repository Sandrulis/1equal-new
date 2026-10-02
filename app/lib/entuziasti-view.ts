import { isOwnAvatarUrl } from "@/app/lib/avatar-url";
import type { Member } from "@/app/lib/demo-data";

export function memberFaceUrl(member: Member, entuziasti: boolean): string | null {
  if (entuziasti) return member.photoUrl ?? null;
  if (member.avatarUrl) return member.avatarUrl;
  if (member.ehl?.photoUrl && member.photoUrl === member.ehl.photoUrl) return null;
  return member.photoUrl ?? null;
}

export function teamLogoUrl(logoUrl: string | null | undefined, entuziasti: boolean): string | null {
  if (!logoUrl) return null;
  if (entuziasti || isOwnAvatarUrl(logoUrl)) return logoUrl;
  return null;
}
