"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

const NativeAppContext = createContext(false);

function subscribe() {
  return () => {};
}

function runningInApp(): boolean {
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.() === true) return true;
  return navigator.userAgent.includes("1EqualAndroid");
}

export function NativeAppProvider({ native, children }: { native: boolean; children: ReactNode }) {
  return <NativeAppContext.Provider value={native}>{children}</NativeAppContext.Provider>;
}

export function useNativeApp() {
  const fromServer = useContext(NativeAppContext);
  const fromClient = useSyncExternalStore(subscribe, runningInApp, () => false);
  return fromServer || fromClient;
}
