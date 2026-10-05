"use server";

import { cookies } from "next/headers";
import { removeAvatar, uploadAvatarJpeg } from "@/app/lib/avatar-storage";
import { redirect } from "next/navigation";
import { deletionBlockedReason, scheduleAccountDeletion, sendAccountDeletionConfirmation, settleAccountDeletionOnSignIn } from "@/app/lib/auth/account-deletion";
import { getVerifiedAuth, needsMfaChallenge, sessionNeedsMfaVerify } from "@/app/lib/auth/mfa";
import { REMEMBER_SESSION_COOKIE, rememberPreferenceOptions } from "@/app/lib/auth/remember-session";
import { isTimeZone, type UserDisplayPreferences } from "@/app/lib/display-preferences";
import { mergeStoredEhlPlayer, parseEhlPlayerPage, parseEhlPlayerUrl, type EhlPlayerProfile } from "@/app/lib/ehl-player";
import { buildEmailHtml } from "@/app/lib/email/build-email-html";
import { emailTakenByOther, requestEmailChange } from "@/app/lib/email/email-change";
import { isEmailAddress } from "@/app/lib/email/email-address";
import { asLang, translate, type MessageKey } from "@/app/lib/messages";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { siteMaintenanceOn } from "@/app/lib/maintenance";
import { moduleEnabledForSport } from "@/app/lib/sport-module";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { getSiteUrl } from "@/app/lib/site";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { writeAudit } from "@/app/lib/security/audit";
import { rateLimit } from "@/app/lib/security/rate-limit";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isSupabaseConfigured } from "@/app/lib/supabase/env";
import { createClient } from "@/app/lib/supabase/server";
import { requireTurnstileToken } from "@/app/lib/security/turnstile";

export type AuthResult = { error: MessageKey } | { confirm: true } | { sent: true } | { ok: true; needsMfa?: boolean; restored?: boolean; ehlPlayer?: EhlPlayerProfile | null; teamCode?: string; display?: UserDisplayPreferences; emailSent?: boolean };

const MIN_PASSWORD = 8;

async function ensureUserProfile(userId: string, email: string, firstName: string, lastName: string) {
  const admin = createAdminClient();
  if (!admin) return "missing-admin";
  const { error } = await admin.rpc("ensure_user_profile", {
    user_id: userId,
    user_email: email,
    user_first_name: firstName,
    user_last_name: lastName,
  });
  return error ? error.message : null;
}

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function mapAuthError(code: string | undefined, message: string): MessageKey {
  const text = message.toLowerCase();
  if (code === "invalid_credentials" || text.includes("invalid login")) return "auth.error.invalid";
  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return "auth.error.confirm";
  if (isExistingAccount(code, message)) return "auth.error.exists";
  if (code === "over_email_send_rate_limit" || text.includes("rate limit")) return "auth.error.rate";
  if (code === "weak_password" || text.includes("password")) return "auth.error.weak";
  return "auth.error.generic";
}

function isExistingAccount(code: string | undefined, message: string) {
  const text = message.toLowerCase();
  return code === "email_exists" || code === "user_already_exists" || text.includes("already registered") || text.includes("already been registered");
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const email = readField(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!email || password.length < MIN_PASSWORD) return { error: "auth.error.invalid" };
  const turnstile = await requireTurnstileToken(readField(formData, "turnstileToken"));
  if (!turnstile.ok) return { error: turnstile.error };

  const remember = formData.get("remember") === "on";
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_SESSION_COOKIE, remember ? "1" : "", rememberPreferenceOptions(remember));
  const supabase = await createClient(remember);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mapAuthError(error.code, error.message) };
  const admin = createAdminClient();
  if (admin && data.user && (await siteMaintenanceOn(admin))) {
    const person = await admin.from("users").select("is_admin").eq("id", data.user.id).maybeSingle();
    if (person.data?.is_admin !== true) {
      await supabase.auth.signOut();
      return { error: "auth.error.maintenance" };
    }
  }
  const settlement = data.user ? await settleAccountDeletionOnSignIn(data.user.id) : "none";
  if (settlement === "deleted") {
    await supabase.auth.signOut();
    return { error: "user.delete.gone" };
  }
  const needsMfa = data.user ? needsMfaChallenge(data.user, data.session?.access_token) : false;

  return { ok: true, needsMfa, restored: settlement === "restored" };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const firstName = readField(formData, "firstName");
  const lastName = readField(formData, "lastName");
  const email = readField(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!firstName || !lastName || !email) return { error: "auth.error.generic" };
  if (password.length < MIN_PASSWORD) return { error: "auth.error.weak" };
  const turnstile = await requireTurnstileToken(readField(formData, "turnstileToken"));
  if (!turnstile.ok) return { error: turnstile.error };
  if (await rateLimit(`signup:${email}`, 5, 15 * 60 * 1000)) return { error: "feedback.error.rate" };

  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };
  if (await siteMaintenanceOn(admin)) return { error: "auth.error.maintenance" };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    app_metadata: { password_set: true },
    user_metadata: { first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}` },
  });
  if (error || !data.user) {
    if (!error || !isExistingAccount(error.code, error.message)) return { error: mapAuthError(error?.code, error?.message ?? "") };
    return signIntoExistingAccount(admin, email, password, firstName, lastName);
  }

  const profileError = await ensureUserProfile(data.user.id, email, firstName, lastName);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "auth.error.generic" };
  }

  const mailed = await mailAccountLink(admin, email, "signup");
  if (!mailed) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "auth.email.unavailable" };
  }
  return { confirm: true };
}

async function signIntoExistingAccount(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<AuthResult> {
  const existing = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const user = existing.data.user;
  if (existing.error || !user) return { error: "auth.error.exists" };

  const passwordChosen = user.app_metadata?.password_set !== false;
  if (!passwordChosen) {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { ...user.app_metadata, password_set: true },
    });
    if (updated.error) return { error: "auth.error.generic" };
    const profileError = await ensureUserProfile(user.id, email, firstName, lastName);
    if (profileError) return { error: "auth.error.generic" };
  }

  const signedIn = await signInAfterSignup(email, password);
  if ("error" in signedIn && !passwordChosen) return { error: "auth.error.generic" };
  if ("error" in signedIn) return { error: "auth.error.exists" };
  return signedIn;
}

async function signInAfterSignup(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient();
  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error) return { error: mapAuthError(signedIn.error.code, signedIn.error.message) };
  const settlement = signedIn.data.user ? await settleAccountDeletionOnSignIn(signedIn.data.user.id) : "none";
  if (settlement === "deleted") {
    await supabase.auth.signOut();
    return { error: "user.delete.gone" };
  }
  const needsMfa = signedIn.data.user ? needsMfaChallenge(signedIn.data.user, signedIn.data.session?.access_token) : false;
  return { ok: true, needsMfa, restored: settlement === "restored" };
}

export async function changePassword(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const current = typeof formData.get("currentPassword") === "string" ? String(formData.get("currentPassword")) : "";
  const next = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirm = typeof formData.get("confirmPassword") === "string" ? String(formData.get("confirmPassword")) : "";
  if (next.length < MIN_PASSWORD) return { error: "auth.error.weak" };
  if (next !== confirm) return { error: "user.password.mismatch" };

  const { supabase, user } = await getVerifiedAuth();
  const email = user?.email;
  if (!supabase || !user || !email || (await sessionNeedsMfaVerify())) return { error: "auth.error.generic" };

  const hasPassword = user.app_metadata?.password_set !== false;
  if (hasPassword) {
    if (!current || next === current) return { error: next === current ? "user.password.same" : "user.password.wrong" };
    const checked = await supabase.auth.signInWithPassword({ email, password: current });
    if (checked.error) return { error: "user.password.wrong" };
    const updated = await supabase.auth.updateUser({ password: next });
    if (updated.error) return { error: mapAuthError(updated.error.code, updated.error.message) };
    return { ok: true };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password: next,
    app_metadata: { ...user.app_metadata, password_set: true },
  });
  if (updated.error) return { error: mapAuthError(updated.error.code, updated.error.message) };
  return { ok: true };
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const email = readField(formData, "email").toLowerCase();
  if (!email) return { error: "auth.error.generic" };
  const turnstile = await requireTurnstileToken(readField(formData, "turnstileToken"));
  if (!turnstile.ok) return { error: turnstile.error };

  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };
  if (await siteMaintenanceOn(admin)) return { error: "auth.error.maintenance" };
  if (await accountHasNoPassword(admin, email)) return { error: "auth.forgot.no_password" };
  if (await rateLimit(`reset:${email}`, 5, 15 * 60 * 1000)) return { sent: true };
  await mailAccountLink(admin, email, "recovery");
  return { sent: true };
}

export async function setNewPassword(formData: FormData): Promise<AuthResult> {
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (password.length < MIN_PASSWORD) return { error: "auth.error.weak" };
  const { supabase, user } = await getVerifiedAuth();
  if (!supabase || !user) return { error: "auth.error.generic" };
  const updated = await supabase.auth.updateUser({ password });
  if (updated.error) return { error: mapAuthError(updated.error.code, updated.error.message) };
  await markPasswordSet(user.id, user.app_metadata);
  return { ok: true };
}

async function markPasswordSet(userId: string, appMetadata: Record<string, unknown> | undefined) {
  if (appMetadata?.password_set !== false) return;
  const admin = createAdminClient();
  if (!admin) return;
  await admin.auth.admin.updateUserById(userId, { app_metadata: { ...appMetadata, password_set: true } });
}

async function accountHasNoPassword(admin: NonNullable<ReturnType<typeof createAdminClient>>, email: string) {
  const safe = email.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const person = await admin.from("users").select("id").ilike("email", safe).maybeSingle();
  if (!person.data?.id) return false;
  const authUser = await admin.auth.admin.getUserById(person.data.id);
  return authUser.data.user?.app_metadata?.password_set === false;
}

async function mailAccountLink(admin: NonNullable<ReturnType<typeof createAdminClient>>, email: string, kind: "signup" | "recovery"): Promise<boolean> {
  if (kind === "recovery" && (await accountHasNoPassword(admin, email))) return false;
  const redirectTo = `${getSiteUrl()}/auth/callback${kind === "recovery" ? "?next=/reset-password" : ""}`;
  const link = await admin.auth.admin.generateLink({
    type: kind === "recovery" ? "recovery" : "magiclink",
    email,
    options: { redirectTo },
  });
  const actionLink = link.data.properties?.action_link;
  if (link.error || !actionLink) return kind === "recovery";

  const integration = await admin.from("site_integrations").select("client_id, client_secret, configured_account_email, is_configured, is_enabled").eq("integration_key", "resend").maybeSingle();
  const fromEmail = integration.data?.client_id?.trim() ?? "";
  const apiKey = openIntegrationSecret(integration.data?.client_secret);
  if (!integration.data?.is_enabled || !integration.data.is_configured || !fromEmail || !apiKey) return false;
  const brand = await getSiteBrand();
  const language = await admin.from("site_languages").select("code").eq("is_default", true).maybeSingle();
  const lang = asLang(language.data?.code);
  const subjectKey = kind === "recovery" ? "auth.forgot.mail_subject" : "auth.signup.mail_subject";
  const bodyKey = kind === "recovery" ? "auth.forgot.mail_body" : "auth.signup.mail_body";
  const buttonKey = kind === "recovery" ? "auth.forgot.mail_button" : "auth.signup.mail_button";
  const html = buildEmailHtml({
    systemName: brand.name,
    eyebrow: translate(lang, kind === "recovery" ? "admin.email.kind.password_reset" : "admin.email.kind.signup"),
    heading: translate(lang, subjectKey),
    bodyText: translate(lang, bodyKey),
    buttonLabel: translate(lang, buttonKey),
    actionLink,
    footerHint: translate(lang, "admin.email.footer"),
    tagline: brand.slogans[lang] ?? "",
    language: lang,
  });
  const from = fromEmail.includes("<") ? fromEmail : `${brand.name} <${fromEmail}>`;
  const replyTo = integration.data?.configured_account_email?.trim() || undefined;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: translate(lang, subjectKey), html, reply_to: replyTo }),
  });
  if (!response.ok) console.error("account email send failed", response.status);
  return response.ok;
}

export async function updateProfile(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const firstName = readField(formData, "firstName");
  const lastName = readField(formData, "lastName");
  const phone = readField(formData, "phone").slice(0, 40);
  const email = readField(formData, "email").toLowerCase();
  if (!firstName || !lastName) return { error: "auth.error.generic" };

  const { supabase, user } = await getVerifiedAuth();
  if (!supabase || !user || (await sessionNeedsMfaVerify())) return { error: "auth.error.generic" };
  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };

  const currentEmail = user.email?.trim().toLowerCase() ?? "";
  const emailChanged = email !== "" && email !== currentEmail;
  if (emailChanged) {
    if (!isEmailAddress(email)) return { error: "roster.error.email" };
    if (await rateLimit(`email-change:${user.id}`, 5, 15 * 60 * 1000)) return { error: "auth.error.rate" };
    const taken = await emailTakenByOther(admin, email, user.id);
    if (taken === null) return { error: "auth.error.generic" };
    if (taken) return { error: "auth.error.exists" };
  }

  const includePlayer = formData.has("playerUrl");
  const teamCode = readField(formData, "teamCode").toUpperCase();
  const teamOk = /^[A-Z0-9]{4,16}$/.test(teamCode);
  let player: EhlPlayerProfile | null = null;
  let savePlayer = false;
  if (includePlayer && teamOk) {
    const team = await admin.from("teams").select("id, sport_id").eq("invite_code", teamCode).maybeSingle();
    if (team.error) return { error: "auth.error.generic" };
    savePlayer = await moduleEnabledForSport(admin, team.data?.sport_id, FRONTEND_MODULE_KEYS.entuziasti, team.data?.id);
    if (savePlayer) {
      const raw = readField(formData, "playerUrl");
      if (raw) {
        const loaded = await loadEhlPlayer(raw);
        if ("error" in loaded) return loaded;
        player = loaded.profile;
      }
    }
  }

  const hasDisplay = formData.has("weekStartDay");
  const display = hasDisplay ? readDisplayForm(formData) : null;
  if (hasDisplay && !display) return { error: "site_settings.error.display" };

  const profile: {
    first_name: string;
    last_name: string;
    name: string;
    phone: string;
    ehl_player?: Record<string, EhlPlayerProfile>;
    week_start_day?: UserDisplayPreferences["weekStartDay"];
    date_format?: UserDisplayPreferences["dateFormat"];
    date_separator?: UserDisplayPreferences["dateSeparator"];
    time_format?: UserDisplayPreferences["timeFormat"];
    timezone?: UserDisplayPreferences["timezone"];
  } = {
    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`.trim(),
    phone,
  };
  if (savePlayer) {
    const current = await admin.from("users").select("ehl_player").eq("id", user.id).maybeSingle();
    if (current.error) return { error: "auth.error.generic" };
    profile.ehl_player = mergeStoredEhlPlayer(current.data?.ehl_player, teamCode, player);
  }
  if (display) {
    profile.week_start_day = display.weekStartDay;
    profile.date_format = display.dateFormat;
    profile.date_separator = display.dateSeparator;
    profile.time_format = display.timeFormat;
    profile.timezone = display.timezone;
  }
  const saved = await admin.from("users").update(profile).eq("id", user.id);
  if (saved.error) return { error: "auth.error.generic" };
  await admin.from("team_members").update({ phone, updated_at: new Date().toISOString() }).eq("user_id", user.id);

  await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}` } });
  let emailSent = false;
  if (emailChanged) {
    emailSent = await requestEmailChange(admin, user.id, email);
    if (!emailSent) return { error: "auth.email.unavailable" };
    await writeAudit("user.email_request", "users", user.id, {});
  }
  return includePlayer ? { ok: true, ehlPlayer: player, teamCode, display: display ?? undefined, emailSent } : { ok: true, display: display ?? undefined, emailSent };
}

function readDisplayForm(formData: FormData): UserDisplayPreferences | null {
  const weekStartDay = readField(formData, "weekStartDay");
  const dateFormat = readField(formData, "dateFormat");
  const dateSeparator = String(formData.get("dateSeparator") ?? "");
  const timeFormat = readField(formData, "timeFormat");
  const timezone = readField(formData, "timezone");
  if (weekStartDay && weekStartDay !== "monday" && weekStartDay !== "sunday") return null;
  if (dateFormat && !["Y-m-d", "d-m-Y", "d/m/Y", "m/d/Y", "d.m.Y"].includes(dateFormat)) return null;
  if (dateSeparator && ![".", "-", "/", " "].includes(dateSeparator)) return null;
  if (timeFormat && timeFormat !== "12" && timeFormat !== "24") return null;
  if (timezone && !isTimeZone(timezone)) return null;
  return {
    weekStartDay: weekStartDay === "monday" || weekStartDay === "sunday" ? weekStartDay : null,
    dateFormat: dateFormat === "Y-m-d" || dateFormat === "d-m-Y" || dateFormat === "d/m/Y" || dateFormat === "m/d/Y" || dateFormat === "d.m.Y" ? dateFormat : null,
    dateSeparator: dateSeparator === "." || dateSeparator === "-" || dateSeparator === "/" || dateSeparator === " " ? dateSeparator : null,
    timeFormat: timeFormat === "12" || timeFormat === "24" ? timeFormat : null,
    timezone: timezone || null,
  };
}

async function loadEhlPlayer(raw: string): Promise<{ profile: EhlPlayerProfile } | { error: MessageKey }> {
  const url = parseEhlPlayerUrl(raw);
  if (!url) return { error: "user.player.invalid" };
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { accept: "text/html" },
    });
    const finalUrl = parseEhlPlayerUrl(response.url);
    if (!finalUrl) return { error: "user.player.invalid" };
    if (!response.ok) return { error: "user.player.failed" };
    const html = (await response.text()).slice(0, 200_000);
    const profile = parseEhlPlayerPage(html, finalUrl.toString());
    if (!profile) return { error: "user.player.not_found" };
    return { profile };
  } catch {
    return { error: "user.player.failed" };
  }
}

export async function saveUserAvatar(formData: FormData): Promise<{ ok: true; url: string | null } | { ok: false; error: MessageKey }> {
  const { user } = await getVerifiedAuth();
  if (!user || (await sessionNeedsMfaVerify())) return { ok: false, error: "auth.error.generic" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "auth.error.config" };
  const path = `users/${user.id}.jpg`;
  const file = formData.get("file");
  if (formData.get("remove") === "1") {
    await removeAvatar(path);
    const cleared = await admin.from("users").update({ avatar_url: null }).eq("id", user.id);
    if (cleared.error) return { ok: false, error: "avatar.error.save" };
    return { ok: true, url: null };
  }
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "avatar.error.file" };
  const uploaded = await uploadAvatarJpeg(file, path, user.id);
  if ("error" in uploaded) return { ok: false, error: uploaded.error };
  const saved = await admin.from("users").update({ avatar_url: uploaded.url }).eq("id", user.id);
  if (saved.error) return { ok: false, error: "avatar.error.save" };
  return { ok: true, url: uploaded.url };
}

export async function saveEventEmails(enabled: boolean): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  if (typeof enabled !== "boolean") return { ok: false, error: "auth.error.generic" };
  const { user } = await getVerifiedAuth();
  if (!user || (await sessionNeedsMfaVerify())) return { ok: false, error: "auth.error.generic" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "auth.error.config" };
  const saved = await admin.from("users").update({ event_emails: enabled }).eq("id", user.id);
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  return { ok: true };
}

export async function requestAccountDeletion(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const { supabase, user } = await getVerifiedAuth();
  const email = user?.email?.trim().toLowerCase() ?? "";
  if (!supabase || !user || !email || (await sessionNeedsMfaVerify())) return { error: "auth.error.generic" };
  if (await rateLimit(`delete-account:${user.id}`, 5, 15 * 60 * 1000)) return { error: "auth.error.rate" };

  const blocked = await deletionBlockedReason(user.id);
  if (blocked) return { error: blocked };

  if (user.app_metadata?.password_set === false) return sendAccountDeletionConfirmation(user.id, email);
  if (!password) return { error: "user.password.wrong" };

  const checked = await supabase.auth.signInWithPassword({ email, password });
  if (checked.error) return { error: "user.password.wrong" };

  const scheduled = await scheduleAccountDeletion(user.id, email);
  if ("error" in scheduled) return scheduled;
  await supabase.auth.signOut();
  return { ok: true };
}

export async function saveUserLanguage(code: string): Promise<boolean> {
  const languageCode = code.trim().toLowerCase();
  if (!/^[a-z]{2,12}$/.test(languageCode)) return false;
  if (!isSupabaseConfigured()) return false;
  const { user } = await getVerifiedAuth();
  if (!user) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const known = await admin.from("site_languages").select("code").eq("code", languageCode).eq("is_active", true).maybeSingle();
  if (!known.data) return false;
  const current = await admin.from("users").select("language_code").eq("id", user.id).maybeSingle();
  if (current.error) return false;
  if (current.data?.language_code === languageCode) return true;
  const saved = await admin.from("users").update({ language_code: languageCode }).eq("id", user.id);
  return !saved.error;
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    const cookieStore = await cookies();
    cookieStore.set(REMEMBER_SESSION_COOKIE, "", rememberPreferenceOptions(false));
  }
  redirect("/");
}
