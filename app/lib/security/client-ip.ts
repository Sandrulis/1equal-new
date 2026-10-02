import { isIP } from "node:net";

const CLOUDFLARE_V4 = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

type HeaderStore = { get(name: string): string | null };

function normalizeIp(raw: string): string {
  const value = raw.trim().replace(/^::ffff:/i, "");
  if (!value || value.length > 64) return "";
  return isIP(value) ? value : "";
}

function firstIp(header: string | null): string {
  if (!header) return "";
  for (const part of header.split(",")) {
    const ip = normalizeIp(part);
    if (ip) return ip;
  }
  return "";
}

function ipv4ToInt(ip: string): number | null {
  if (isIP(ip) !== 4) return null;
  const parts = ip.split(".");
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = (value << 8) + octet;
  }
  return value >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ipInt = ipv4ToInt(ip);
  const baseInt = base ? ipv4ToInt(base) : null;
  if (ipInt == null || baseInt == null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function isCloudflarePeer(ip: string): boolean {
  if (isIP(ip) === 4) return CLOUDFLARE_V4.some((cidr) => ipv4InCidr(ip, cidr));
  if (isIP(ip) !== 6) return false;
  const parts = ip.toLowerCase().split(":");
  const head = parts[0] ?? "";
  if (head === "2400" && parts[1] === "cb00") return true;
  if (head === "2606" && parts[1] === "4700") return true;
  if (head === "2803" && parts[1] === "f800") return true;
  if (head === "2405" && (parts[1] === "b500" || parts[1] === "8100")) return true;
  if (head === "2c0f" && parts[1] === "f248") return true;
  if (head === "2a06") {
    const second = Number.parseInt(parts[1] ?? "", 16);
    return second >= 0x98c0 && second <= 0x98c7;
  }
  return false;
}

function countryCode(raw: string | null): string {
  const code = raw?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") return "";
  return code;
}

export function trustedClientAddress(headerStore: HeaderStore): { ip: string; countryCode: string } {
  const platform = firstIp(headerStore.get("x-vercel-forwarded-for")) || firstIp(headerStore.get("x-real-ip"));
  const cloudflare = firstIp(headerStore.get("cf-connecting-ip"));
  if (platform && cloudflare && isCloudflarePeer(platform)) {
    return { ip: cloudflare, countryCode: countryCode(headerStore.get("cf-ipcountry")) };
  }
  if (platform) return { ip: platform, countryCode: countryCode(headerStore.get("x-vercel-ip-country")) };
  if (cloudflare && headerStore.get("cf-ray")) {
    return { ip: cloudflare, countryCode: countryCode(headerStore.get("cf-ipcountry")) };
  }
  return { ip: "", countryCode: "" };
}

export function trustedClientIp(headerStore: HeaderStore): string {
  return trustedClientAddress(headerStore).ip;
}
