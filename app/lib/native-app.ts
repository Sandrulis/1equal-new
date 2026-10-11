import { headers } from "next/headers";

const NATIVE_APP_MARK = "1EqualAndroid";

export async function isNativeAppRequest(): Promise<boolean> {
  const userAgent = (await headers()).get("user-agent") ?? "";
  return userAgent.includes(NATIVE_APP_MARK);
}
