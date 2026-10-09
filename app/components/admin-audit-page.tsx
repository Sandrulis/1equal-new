"use client";

import { useEffect, useState } from "react";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import type { AuditFilterOption, AuditLogRow } from "@/app/lib/security/audit-log-types";
import { listAuditLog } from "@/app/lib/security/audit-query";

const ACTION_LABEL: Record<string, MessageKey> = {
  "auth.sign_in": "audit.action.auth.sign_in",
  "auth.sign_out": "audit.action.auth.sign_out",
  "auth.sign_up": "audit.action.auth.sign_up",
  "auth.password_reset": "audit.action.auth.password_reset",
  "auth.password_set": "audit.action.auth.password_set",
  "team.create": "audit.action.team.create",
  "team.update": "audit.action.team.update",
  "team.join": "audit.action.team.join",
  "team.invite": "audit.action.team.invite",
  "team.watch": "audit.action.team.watch",
  "team.unwatch": "audit.action.team.unwatch",
  "team.delete": "audit.action.team.delete",
  "event.create": "audit.action.event.create",
  "event.update": "audit.action.event.update",
  "event.delete": "audit.action.event.delete",
  "event.attendance": "audit.action.event.attendance",
  "member.profile": "audit.action.member.profile",
  "member.admin": "audit.action.member.admin",
  "member.remove": "audit.action.member.remove",
  "member.email_request": "audit.action.member.email_request",
  "balance.adjust": "audit.action.balance.adjust",
  "users.delete": "audit.action.users.delete",
  "user.email_request": "audit.action.user.email_request",
  "site_settings.save": "audit.action.site_settings.save",
  "site_settings.maintenance": "audit.action.site_settings.maintenance",
  "integration.save": "audit.action.integration.save",
  "integration.enabled": "audit.action.integration.enabled",
  "integration.reset": "audit.action.integration.reset",
};

const fieldClass = "mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-train";

function localIso(value: string, end: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0).toISOString();
}

export function AdminAuditPage() {
  const { t } = useLanguage();
  const { formatDateTime } = useDisplayFormat();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actorId, setActorId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState<"all" | "ok" | "error">("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [users, setUsers] = useState<AuditFilterOption[]>([]);
  const [teams, setTeams] = useState<AuditFilterOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void listAuditLog({
        fromIso: localIso(from, false),
        toIso: localIso(to, true),
        actorId: actorId || null,
        teamId: teamId || null,
        status,
        query,
      }).then((result) => {
        if (!active) return;
        setRows(result.rows);
        setUsers(result.users);
        setTeams(result.teams);
        setLoading(false);
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [actorId, from, query, status, teamId, to]);

  function actionLabel(action: string) {
    const key = ACTION_LABEL[action];
    return key ? t(key) : action;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.admin.audit")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t("admin.audit.lead")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">
          {t("admin.audit.from")}
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium">
          {t("admin.audit.to")}
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium">
          {t("admin.audit.user")}
          <select value={actorId} onChange={(event) => setActorId(event.target.value)} className={fieldClass}>
            <option value="">{t("admin.filter.all")}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t("admin.audit.team")}
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className={fieldClass}>
            <option value="">{t("admin.filter.all")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "ok", "error"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === item ? "bg-navy text-white" : "bg-ice text-ink"}`}
          >
            {t(item === "all" ? "admin.filter.all" : item === "ok" ? "admin.audit.status.ok" : "admin.audit.status.error")}
          </button>
        ))}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admin.audit.search")}
          className="min-w-56 flex-1 rounded-lg bg-ice px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-train"
        />
      </div>
      {loading ? <p className="text-sm text-muted">{t("admin.loading")}</p> : null}
      {!loading && rows.length === 0 ? <p className="text-sm text-muted">{t("admin.audit.empty")}</p> : null}
      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{actionLabel(row.action)}</p>
                <p className={`text-xs font-medium ${row.status === "error" ? "text-game" : "text-muted"}`}>
                  {row.status === "error" ? t("admin.audit.status.error") : t("admin.audit.status.ok")}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted">{formatDateTime(row.createdAt)}</p>
              <p className="mt-2 text-sm">
                {[row.actorName || row.actorEmail, row.teamName].filter(Boolean).join(" - ") || row.actorEmail}
              </p>
              {row.actorName && row.actorEmail ? <p className="text-sm text-muted">{row.actorEmail}</p> : null}
              {row.detail ? <p className="mt-1 text-sm text-muted">{row.detail}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
