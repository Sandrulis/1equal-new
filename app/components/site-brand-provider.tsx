"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SITE_NAME } from "@/app/lib/site-brand";
import type { SiteBrand } from "@/app/lib/site-admin/types";

const SiteBrandContext = createContext<SiteBrand>({ name: DEFAULT_SITE_NAME, logoUrl: null, faviconUrl: null });

export function SiteBrandProvider({ brand, children }: { brand: SiteBrand; children: ReactNode }) {
  return <SiteBrandContext.Provider value={brand}>{children}</SiteBrandContext.Provider>;
}

export function useSiteBrand(): SiteBrand {
  return useContext(SiteBrandContext);
}
