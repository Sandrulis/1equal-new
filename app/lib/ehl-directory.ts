import catalog from "@/data/ehl-teams.json";

export type EhlTeamMark = "info" | "no" | "yes";

export type EhlDirectoryTeam = {
  id: string;
  name: string;
  manager: string;
  url: string;
};

type RawTeam = {
  id?: string;
  name?: string;
  manager?: string;
  url?: string;
  ok?: boolean;
};

export function listEhlDirectory(): EhlDirectoryTeam[] {
  const teams = catalog.teams as RawTeam[];
  return teams.flatMap((team) => {
    if (team.ok === false || !team.id || !team.name || !team.url) return [];
    return [{ id: team.id, name: team.name, manager: team.manager?.trim() ?? "", url: team.url }];
  });
}
