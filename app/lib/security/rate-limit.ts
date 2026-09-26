import { createAdminClient } from "@/app/lib/supabase/admin";

const hits = new Map<string, number[]>();

function memoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const stamps = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (stamps.length >= limit) {
    hits.set(key, stamps);
    return true;
  }
  stamps.push(now);
  hits.set(key, stamps);
  if (hits.size > 5000) {
    for (const [id, times] of hits) {
      if (times.every((time) => now - time >= windowMs)) hits.delete(id);
    }
  }
  return false;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      bucket: key.slice(0, 200),
      max_hits: limit,
      window_seconds: Math.max(1, Math.round(windowMs / 1000)),
    });
    if (!error && typeof data === "boolean") return data;
  }
  return memoryRateLimit(key, limit, windowMs);
}
