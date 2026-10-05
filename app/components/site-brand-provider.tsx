"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SITE_DISPLAY } from "@/app/lib/display-preferences";
import { DEFAULT_SITE_NAME } from "@/app/lib/site-brand";
import type { SiteBrand } from "@/app/lib/site-admin/types";
import { DEFAULT_CURRENCY, DEFAULT_GAME_VOTING_HOURS, DEFAULT_TRAINING_VOTING_HOURS } from "@/app/lib/team-defaults";

const SiteBrandContext = createContext<SiteBrand>({
  name: DEFAULT_SITE_NAME,
  logoUrl: null,
  faviconUrl: null,
  display: DEFAULT_SITE_DISPLAY,
  currency: DEFAULT_CURRENCY,
  trainingVotingHours: DEFAULT_TRAINING_VOTING_HOURS,
  gameVotingHours: DEFAULT_GAME_VOTING_HOURS,
  contactEmail: "",
  maintenance: false,
  slogans: {},
});

export function SiteBrandProvider({ brand, children }: { brand: SiteBrand; children: ReactNode }) {
  return <SiteBrandContext.Provider value={brand}>{children}</SiteBrandContext.Provider>;
}

export function useSiteBrand(): SiteBrand {
  return useContext(SiteBrandContext);
}
