"use client";

import { createContext, useContext, type ReactNode } from "react";

const EntuziastiContext = createContext(true);

export function EntuziastiProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <EntuziastiContext.Provider value={enabled}>{children}</EntuziastiContext.Provider>;
}

export function useEntuziasti(): boolean {
  return useContext(EntuziastiContext);
}
