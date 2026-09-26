export const FRONTEND_MODULE_KEYS = {
  subteams: "module_subteams",
  gameLayout: "module_game_layout",
  finance: "module_finance",
} as const;

export const KNOWN_FRONTEND_MODULE_KEYS = Object.values(FRONTEND_MODULE_KEYS);

export const BUILTIN_NAV_KEYS = ["module_calendar", "module_team", "module_venues"] as const;

export const MODULE_KEY_PATTERN = /^[a-z0-9._:-]+$/;

export type FrontendModule = {
  id: string;
  moduleKey: string;
  isEnabled: boolean;
  sortOrder: number;
};

export function normalizeModuleKey(value: string): string {
  return value.trim().toLowerCase();
}
