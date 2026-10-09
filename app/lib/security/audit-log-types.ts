export type AuditLogRow = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  status: "ok" | "error";
  actorName: string;
  actorEmail: string;
  teamName: string;
  detail: string;
};

export type AuditLogFilters = {
  fromIso: string | null;
  toIso: string | null;
  actorId: string | null;
  teamId: string | null;
  status: "all" | "ok" | "error";
  query: string;
};

export type AuditFilterOption = { id: string; label: string };
