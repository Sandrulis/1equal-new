export function isOwnAvatarUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.includes("/storage/v1/object/public/avatars/");
  } catch {
    return false;
  }
}
