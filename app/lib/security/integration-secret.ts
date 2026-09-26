import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc1:";

function secretKey(): Buffer | null {
  const material = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!material) return null;
  return createHash("sha256").update(material).digest();
}

export function sealIntegrationSecret(value: string): string {
  const plain = value.trim();
  if (!plain || plain.startsWith(PREFIX)) return plain;
  const key = secretKey();
  if (!key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function openIntegrationSecret(value: string | null | undefined): string {
  const stored = value?.trim() ?? "";
  if (!stored.startsWith(PREFIX)) return stored;
  const key = secretKey();
  if (!key) return "";
  const [iv, tag, data] = stored.slice(PREFIX.length).split(".");
  if (!iv || !tag || !data) return "";
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
