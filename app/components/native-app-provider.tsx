"use client";

import { createContext, useContext, type ReactNode } from "react";

const NativeAppContext = createContext(false);

export function NativeAppProvider({ native, children }: { native: boolean; children: ReactNode }) {
  return <NativeAppContext.Provider value={native}>{children}</NativeAppContext.Provider>;
}

export function useNativeApp() {
  return useContext(NativeAppContext);
}
