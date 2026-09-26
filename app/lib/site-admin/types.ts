export type SiteBrand = {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
};

export type SiteLanguage = {
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
};

export type SiteTranslationRow = {
  key: string;
  bundled: boolean;
  values: Record<string, string>;
};

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

export type SystemTeam = {
  id: string;
  name: string;
  updatedAt: string;
};

export type SystemSubteam = {
  id: string;
  teamId: string;
  teamName: string;
  name: string;
  color: string;
  updatedAt: string;
};

export const INTEGRATION_KEYS = ["turnstile", "google_oauth", "resend", "umami", "sentry"] as const;

export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export type IntegrationStatus = {
  key: IntegrationKey;
  clientId: string;
  replyTo: string;
  hasSecret: boolean;
  configured: boolean;
  enabled: boolean;
};

export type PublicUmami = {
  websiteId: string;
  scriptUrl: string;
};

export type AdminConsole = {
  brand: SiteBrand;
  languages: SiteLanguage[];
  translations: SiteTranslationRow[];
  users: SystemUser[];
  teams: SystemTeam[];
  subteams: SystemSubteam[];
  integrations: IntegrationStatus[];
  googleRedirectUrl: string;
};

export type PublicI18n = {
  languages: Pick<SiteLanguage, "code" | "name" | "isDefault">[];
  defaultCode: string;
  overrides: Record<string, Record<string, string>>;
};
