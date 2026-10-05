export const JOIN_INVITE_COOKIE = "1equal-join";

const CODE = /^[A-Z0-9]{4,16}$/;

export function normalizeJoinCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE.test(code) ? code : null;
}

export function joinInviteCookieOptions() {
  const secure = process.env.NODE_ENV === "production" || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  return { path: "/", sameSite: "lax" as const, secure, httpOnly: true, maxAge: 14 * 24 * 60 * 60 };
}
