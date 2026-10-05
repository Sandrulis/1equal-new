export const FRONTEND_MODULE_KEYS = {
  subteams: "module_subteams",
  gameLayout: "module_game_layout",
  finance: "module_finance",
  calendar: "module_calendar",
  entuziasti: "module_entuziasti",
  pond: "module_pond",
} as const;

export const KNOWN_FRONTEND_MODULE_KEYS = Object.values(FRONTEND_MODULE_KEYS);

export const BUILTIN_NAV_KEYS = ["module_team", "module_venues"] as const;

export const MODULE_KEY_PATTERN = /^[a-z0-9._:-]+$/;

export type FrontendModule = {
  id: string;
  moduleKey: string;
  isEnabled: boolean;
  isIndividual: boolean;
  sortOrder: number;
};

export function normalizeModuleKey(value: string): string {
  return value.trim().toLowerCase();
}

export function moduleOnForSport(enabledModules: readonly string[] | null | undefined, key: string, sportModuleKeys: readonly string[] | null | undefined): boolean {
  if (!enabledModules) return true;
  if (!enabledModules.includes(key)) return false;
  if (!sportModuleKeys) return true;
  return sportModuleKeys.includes(key);
}

export function entuziastiForSport(enabledModules: readonly string[] | null | undefined, sportModuleKeys: readonly string[] | null | undefined): boolean {
  return moduleOnForSport(enabledModules, FRONTEND_MODULE_KEYS.entuziasti, sportModuleKeys);
}
