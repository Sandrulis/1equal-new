"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Subteam, Venue } from "@/app/lib/demo-data";

type SubteamInput = { name: string; color: string };
type VenueInput = { name: string; pricePerHour: number };

type TeamCatalogValue = {
  subteams: Subteam[];
  venues: Venue[];
  addSubteam: (input: SubteamInput) => void;
  updateSubteam: (id: string, input: SubteamInput) => void;
  removeSubteam: (id: string) => void;
  addVenue: (input: VenueInput) => void;
  updateVenue: (id: string, input: VenueInput) => void;
  removeVenue: (id: string) => void;
  subteamById: (id: string) => Subteam | undefined;
  venueById: (id: string) => Venue | undefined;
};

const TeamCatalogContext = createContext<TeamCatalogValue | null>(null);

export function TeamCatalogProvider({ seedDemo = false, children }: { seedDemo?: boolean; children: ReactNode }) {
  const [subteams, setSubteams] = useState<Subteam[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    if (!seedDemo) return;
    let active = true;
    void import("@/app/lib/demo-data").then((mod) => {
      if (!active) return;
      setSubteams(mod.SUBTEAMS);
      setVenues(mod.VENUES);
    });
    return () => {
      active = false;
    };
  }, [seedDemo]);

  const value = useMemo<TeamCatalogValue>(() => {
    return {
      subteams,
      venues: venues.filter((item) => !item.hidden),
      addSubteam(input) {
        setSubteams((current) => [
          ...current,
          { id: `subteam-${Date.now().toString(36)}`, name: input.name, color: input.color, updatedAt: stamp() },
        ]);
      },
      updateSubteam(id, input) {
        setSubteams((current) =>
          current.map((item) => (item.id === id ? { ...item, name: input.name, color: input.color, updatedAt: stamp() } : item)),
        );
      },
      removeSubteam(id) {
        setSubteams((current) => current.filter((item) => item.id !== id));
      },
      addVenue(input) {
        setVenues((current) => [
          ...current,
          {
            id: `venue-${Date.now().toString(36)}`,
            name: input.name,
            area: "",
            pricePerHour: input.pricePerHour,
            updatedAt: stamp(),
          },
        ]);
      },
      updateVenue(id, input) {
        setVenues((current) =>
          current.map((item) =>
            item.id === id ? { ...item, name: input.name, pricePerHour: input.pricePerHour, updatedAt: stamp() } : item,
          ),
        );
      },
      removeVenue(id) {
        setVenues((current) => current.map((item) => (item.id === id ? { ...item, hidden: true, updatedAt: stamp() } : item)));
      },
      subteamById(id) {
        return subteams.find((item) => item.id === id);
      },
      venueById(id) {
        return venues.find((item) => item.id === id);
      },
    };
  }, [subteams, venues]);

  return <TeamCatalogContext.Provider value={value}>{children}</TeamCatalogContext.Provider>;
}

export function useTeamCatalog(): TeamCatalogValue {
  const value = useContext(TeamCatalogContext);
  if (!value) throw new Error("useTeamCatalog must be used within TeamCatalogProvider");
  return value;
}

function stamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
