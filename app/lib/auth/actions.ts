"use server";

import { redirect } from "next/navigation";
import { parseEhlPlayerPage, parseEhlPlayerUrl, type EhlPlayerProfile } from "@/app/lib/ehl-player";
import type { MessageKey } from "@/app/lib/messages";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isSupabaseConfigured } from "@/app/lib/supabase/env";
import { createClient } from "@/app/lib/supabase/server";

export type AuthResult = { error: MessageKey } | { confirm: true } | { ok: true; ehlPlayer?: EhlPlayerProfile | null; teamCode?: string };

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
  if (code === "email_exists" || code === "user_already_exists" || text.includes("already registered") || text.includes("already been registered")) {
    return "auth.error.exists";
  }
  if (code === "over_email_send_rate_limit" || text.includes("rate limit")) return "auth.error.rate";
  if (code === "weak_password" || text.includes("password")) return "auth.error.weak";
  return "auth.error.generic";
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const email = readField(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!email || password.length < MIN_PASSWORD) return { error: "auth.error.invalid" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mapAuthError(error.code, error.message) };

  return { ok: true };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const firstName = readField(formData, "firstName");
  const lastName = readField(formData, "lastName");
  const email = readField(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!firstName || !lastName || !email) return { error: "auth.error.generic" };
  if (password.length < MIN_PASSWORD) return { error: "auth.error.weak" };

  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}` },
  });
  if (error || !data.user) return { error: mapAuthError(error?.code, error?.message ?? "") };

  const profileError = await ensureUserProfile(data.user.id, email, firstName, lastName);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "auth.error.generic" };
  }

  const supabase = await createClient();
  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error) return { error: mapAuthError(signedIn.error.code, signedIn.error.message) };

  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const current = typeof formData.get("currentPassword") === "string" ? String(formData.get("currentPassword")) : "";
  const next = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirm = typeof formData.get("confirmPassword") === "string" ? String(formData.get("confirmPassword")) : "";
  if (!current) return { error: "user.password.wrong" };
  if (next.length < MIN_PASSWORD) return { error: "auth.error.weak" };
  if (next !== confirm) return { error: "user.password.mismatch" };
  if (next === current) return { error: "user.password.same" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { error: "auth.error.generic" };

  const checked = await supabase.auth.signInWithPassword({ email, password: current });
  if (checked.error) return { error: "user.password.wrong" };

  const updated = await supabase.auth.updateUser({ password: next });
  if (updated.error) return { error: mapAuthError(updated.error.code, updated.error.message) };

  return { ok: true };
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const email = readField(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!email) return { error: "auth.error.generic" };
  if (password.length < MIN_PASSWORD) return { error: "auth.error.weak" };

  const admin = createAdminClient();
  if (!admin) return { error: "auth.error.config" };

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) return { error: "auth.error.generic" };
  const user = listed.data.users.find((item) => item.email?.toLowerCase() === email);
  if (!user) return { error: "auth.error.missing" };

  const updated = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (updated.error) return { error: mapAuthError(updated.error.code, updated.error.message) };

  const supabase = await createClient();
  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error) return { error: mapAuthError(signedIn.error.code, signedIn.error.message) };

  return { ok: true };
}

export async function updateProfile(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { error: "auth.error.config" };

  const firstName = readField(formData, "firstName");
  const lastName = readField(formData, "lastName");
  if (!firstName || !lastName) return { error: "auth.error.generic" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "auth.error.generic" };

  const includePlayer = formData.has("playerUrl");
  const teamCode = readField(formData, "teamCode").toUpperCase();
  const teamOk = /^[A-Z0-9]{4,16}$/.test(teamCode);
  let player: EhlPlayerProfile | null = null;
  if (includePlayer) {
    if (!teamOk) return { error: "auth.error.generic" };
    const raw = readField(formData, "playerUrl");
    if (raw) {
      const loaded = await loadEhlPlayer(raw);
      if ("error" in loaded) return loaded;
      player = loaded.profile;
    }
  }

  const { error } = await supabase.rpc("update_own_profile", {
    user_first_name: firstName,
    user_last_name: lastName,
    user_ehl_team: includePlayer && teamOk ? teamCode : null,
    user_ehl_player: player,
    user_ehl_set: includePlayer && teamOk,
  });
  if (error) return { error: "auth.error.generic" };

  await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}` } });
  return includePlayer ? { ok: true, ehlPlayer: player, teamCode } : { ok: true };
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

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
