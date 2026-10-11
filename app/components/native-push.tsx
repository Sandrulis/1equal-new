"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { savePushDevice } from "@/app/lib/push/actions";

const TOKEN_KEY = "1equal-push-token";

type NativeWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

function storedToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function rememberToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // The WebView can block storage. The registration listener still sends the token.
  }
}

export function NativePush() {
  const pathname = usePathname();

  useEffect(() => {
    const native = (window as NativeWindow).Capacitor?.isNativePlatform?.() === true;
    if (!native) return;
    let cancelled = false;
    const removals: Array<() => void> = [];

    void (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      if (cancelled) return;
      const opened = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const path = action.notification.data?.path;
        if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) window.location.assign(path);
      });
      removals.push(() => void opened.remove());
      const registered = await PushNotifications.addListener("registration", (event) => {
        const token = event.value?.trim();
        if (!token) return;
        rememberToken(token);
        void savePushDevice(token);
      });
      removals.push(() => void registered.remove());

      await PushNotifications.createChannel({
        id: "events",
        name: "Notikumi",
        description: "Jaunas spēles un treniņi",
        importance: 5,
        visibility: 1,
        sound: "default",
      }).catch(() => undefined);

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
      if (cancelled || permission.receive !== "granted") return;
      await PushNotifications.register();
    })();

    return () => {
      cancelled = true;
      for (const remove of removals) remove();
    };
  }, []);

  useEffect(() => {
    const native = (window as NativeWindow).Capacitor?.isNativePlatform?.() === true;
    const token = storedToken();
    if (!native || !token) return;
    void savePushDevice(token);
  }, [pathname]);

  return null;
}
