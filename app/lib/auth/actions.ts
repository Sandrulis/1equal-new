"use server";

import { redirect } from "next/navigation";
import type { MessageKey } from "@/app/lib/messages";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isSupabaseConfigured } from "@/app/lib/supabase/env";
import { createClient } from "@/app/lib/supabase/server";

export type AuthResult = { error: MessageKey } | { confirm: true } | { ok: true };

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

  const { error } = await supabase.rpc("update_own_profile", {
    user_first_name: firstName,
    user_last_name: lastName,
  });
  if (error) return { error: "auth.error.generic" };

  await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}` } });
  return { ok: true };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
