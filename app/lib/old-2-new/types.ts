export const STEP_IDS = ["read", "users", "team", "members", "events", "rsvp", "balances"] as const;

export type StepId = (typeof STEP_IDS)[number];
export type StepState = "wait" | "run" | "ok" | "err";

export type ProgressEvent = {
  step: StepId;
  done: number;
  total: number;
  state: StepState;
};

export type ScanCounts = {
  users: number;
  existingUsers: number;
  noPassword: number;
  members: number;
  hiddenMembers: number;
  kids: number;
  parents: number;
  addresses: number;
  jerseyCleared: number;
  defenseFolded: number;
  subteams: number;
  venues: number;
  events: number;
  hiddenEvents: number;
  meetings: number;
  gamesWithoutExpense: number;
  missingVenue: number;
  rsvp: number;
  waitingRsvp: number;
  guestUsers: number;
  balanceAdjustments: number;
  invoices: number;
  otherTeams: number;
  brokenLineups: number;
};

export type LoginPlan = "password" | "reset" | "linked";

export type PreviewUser = {
  name: string;
  email: string;
  phone: string;
  login: LoginPlan;
  onRoster: boolean;
};

export type PreviewMember = {
  name: string;
  email: string;
  number: number | null;
  clearedNumber: number | null;
  position: string;
  positionFrom: string;
  balance: number;
  subteams: string;
  hidden: boolean;
  feeExempt: boolean;
  teamAdmin: boolean;
};

export type PreviewEvent = {
  date: string;
  start: string;
  type: "game" | "training";
  venue: string;
  subteam: string;
  expense: number | null;
  expenseWasEmpty: boolean;
  withCoach: boolean;
  hidden: boolean;
  going: number;
  absent: number;
  lineup: number;
};

export type PreviewBalance = {
  name: string;
  balance: number;
  history: number;
  adjustment: number;
};

export type MovePreview = {
  leader: string;
  users: PreviewUser[];
  members: PreviewMember[];
  subteams: { name: string; color: string }[];
  venues: { name: string; price: number; hidden: boolean }[];
  events: PreviewEvent[];
  balances: PreviewBalance[];
};

export type ScanReport = {
  teamName: string;
  inviteCode: string;
  balance: number;
  counts: ScanCounts;
  alreadyInNewDb: boolean;
  canWrite: boolean;
  preview: MovePreview;
};
