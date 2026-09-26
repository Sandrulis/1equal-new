import type { SiteDisplaySettings } from "@/app/lib/display-preferences";
import type { FrontendModule } from "@/app/lib/frontend-modules";
import type { CurrencyCode } from "@/app/lib/team-defaults";

export type SiteBrand = {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  display: SiteDisplaySettings;
  currency: CurrencyCode;
  trainingVotingHours: number;
  gameVotingHours: number;
  contactEmail: string;
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
  lastSeenAt: string | null;
  teams: { id: string; name: string }[];
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

export type SystemTeamMember = {
  teamId: string;
  userId: string;
  name: string;
  email: string;
  number: number | null;
  position: string;
  phone: string;
  photoUrl: string | null;
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

export type PublicSentry = {
  dsn: string;
  environment: string;
};

export const EMAIL_KINDS = ["signup", "password_reset", "invite", "event"] as const;

export type EmailKind = (typeof EMAIL_KINDS)[number];

export type EmailTemplate = {
  kind: EmailKind;
  subjects: Record<string, string>;
  bodies: Record<string, string>;
  buttons: Record<string, string>;
};

export type AdminTodo = {
  id: string;
  title: string;
  isDone: boolean;
  completedAt: string | null;
  createdAt: string;
};

export type AdminConsole = {
  brand: SiteBrand;
  languages: SiteLanguage[];
  translations: SiteTranslationRow[];
  users: SystemUser[];
  teams: SystemTeam[];
  members: SystemTeamMember[];
  subteams: SystemSubteam[];
  modules: FrontendModule[];
  integrations: IntegrationStatus[];
  googleRedirectUrl: string;
  emailTemplates: EmailTemplate[];
  todos: AdminTodo[];
  watchedTeamIds: string[];
};

export type PublicI18n = {
  languages: Pick<SiteLanguage, "code" | "name" | "isDefault">[];
  defaultCode: string;
  overrides: Record<string, Record<string, string>>;
};
