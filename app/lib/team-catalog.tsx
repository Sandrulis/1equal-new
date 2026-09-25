"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SUBTEAMS, VENUES, type Subteam, type Venue } from "@/app/lib/demo-data";

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

export function TeamCatalogProvider({ children }: { children: ReactNode }) {
  const [subteams, setSubteams] = useState<Subteam[]>(SUBTEAMS);
  const [venues, setVenues] = useState<Venue[]>(VENUES);

  const value = useMemo<TeamCatalogValue>(() => {
    return {
      subteams,
      venues,
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
        setVenues((current) => current.filter((item) => item.id !== id));
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
