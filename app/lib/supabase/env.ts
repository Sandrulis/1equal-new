function supabaseUrl(value: string): string {
  return value.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

export function getSupabasePublicEnv() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const url = raw ? supabaseUrl(raw) : "";
  if (!url || !anonKey || url.includes("YOUR_PROJECT_REF") || anonKey.includes("your_anon")) {
    return null;
  }
  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabasePublicEnv() !== null;
}
