"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ContentImage } from "@/app/components/content-image";
import { AccountSettingsDialog } from "@/app/components/account-settings-dialog";
import { CalendarExportDialog } from "@/app/components/calendar-export-dialog";
import { MfaSettingsDialog } from "@/app/components/mfa-settings-dialog";
import { NotificationsDialog } from "@/app/components/notifications-dialog";
import { ChangePasswordDialog } from "@/app/components/change-password-dialog";
import { IconLogout, IconTipButton } from "@/app/components/icon-tip-button";
import { LanguageMenu } from "@/app/components/language-menu";
import { PlayerBalanceDialog } from "@/app/components/player-profile";
import type { BalanceHold } from "@/app/components/team-roster";
import { TeamSwitcher } from "@/app/components/team-switcher";
import type { IssuedTeam } from "@/app/lib/invite-code";
import { signOut } from "@/app/lib/auth/actions";
import { accountName, teamPlayer, type AccountProfile } from "@/app/lib/auth/profile";
import type { Member } from "@/app/lib/demo-data";
import { CURRENT_USER_ID } from "@/app/lib/demo-constants";
import { useFormatMoney } from "@/app/components/currency-provider";
import type { CreateTeamInput } from "@/app/lib/team-defaults";
import type { Sport } from "@/app/lib/sports";
import { useLanguage } from "@/app/lib/language";
import { claimMobileMenu, releaseMobileMenu, useExclusiveMobileMenu } from "@/app/lib/mobile-menu";
import { useHeaderBottom, useNarrow, usePresence } from "@/app/lib/use-presence";

const HoldDialog = dynamic(() => import("@/app/components/team-roster").then((mod) => mod.HoldDialog));

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TopBar({
  onHome,
  account = null,
  team = null,
  teams = [],
  onSelectTeam,
  onUnwatchTeam,
  onCreateTeam,
  settingsOpen = false,
  onSettingsOpenChange,
  onAccountChange,
  onOpenMenu,
  menuOpen = false,
  onOpenAdmin,
  adminOpen = false,
  balanceMember = null,
  reservedHolds = [],
  calendarIntegration = false,
  entuziasti = true,
  enabledModules = null,
  individualModuleKeys = [],
  sports = [],
}: {
  onHome: () => void;
  account?: AccountProfile | null;
  team?: Pick<IssuedTeam, "id" | "name" | "code" | "logoUrl" | "sportId" | "moduleKeys" | "demo"> | null;
  teams?: IssuedTeam[];
  onSelectTeam?: (code: string) => void;
  onUnwatchTeam?: (teamId: string) => void | Promise<void>;
  onCreateTeam?: (input: CreateTeamInput) => void;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  onAccountChange?: (account: AccountProfile) => void;
  onOpenMenu?: () => void;
  menuOpen?: boolean;
  onOpenAdmin?: () => void;
  adminOpen?: boolean;
  balanceMember?: Member | null;
  reservedHolds?: BalanceHold[];
  calendarIntegration?: boolean;
  entuziasti?: boolean;
  enabledModules?: string[] | null;
  individualModuleKeys?: string[];
  sports?: Sport[];
}) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const [profile, setProfile] = useState(account);
  const [demoName, setDemoName] = useState("");
  useEffect(() => {
    if (account) return;
    let active = true;
    void import("@/app/lib/demo-data").then((mod) => {
      if (!active) return;
      const demo = mod.MEMBERS.find((member) => member.id === CURRENT_USER_ID) ?? mod.MEMBERS[0];
      setDemoName(demo?.name ?? "");
    });
    return () => {
      active = false;
    };
  }, [account]);
  const name = profile ? accountName(profile) : demoName;

  const linkedPhoto = entuziasti ? (teamPlayer(profile, team?.code)?.photoUrl ?? null) : null;
  const photoUrl = linkedPhoto ?? profile?.avatarUrl ?? null;
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const reservedBalance = Math.round(reservedHolds.reduce((sum, hold) => sum + hold.amount, 0) * 100) / 100;

  function saveAccount(next: Pick<AccountProfile, "firstName" | "lastName" | "ehlPlayers" | "avatarUrl" | "display"> & { eventEmails?: boolean; phone?: string }) {
    setProfile((current) => (current ? { ...current, ...next } : current));
    if (profile) onAccountChange?.({ ...profile, ...next });
  }

  return (
    <header className="sticky top-0 z-30 order-1 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-paper px-4 py-1 max-[599px]:z-[60] sm:px-6 lg:order-none lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMenu ? (
          <button type="button" aria-label={t("nav.sections")} aria-expanded={menuOpen} onClick={onOpenMenu} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-ice min-[600px]:hidden">
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        ) : null}
        <TeamSwitcher
          team={team}
          teams={teams}
          canSwitch={Boolean(account)}
          onHome={onHome}
          onSelect={onSelectTeam ?? (() => onHome())}
          onUnwatch={onUnwatchTeam}
          onCreate={onCreateTeam ?? (() => undefined)}
          sports={sports}
          enabledModules={enabledModules}
          individualModuleKeys={individualModuleKeys}
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <LanguageMenu />
        {balanceMember ? (
          <div className="text-right">
            <button
              type="button"
              aria-label={t("roster.balance")}
              onClick={() => setBalanceOpen(true)}
              className={`rounded-lg px-2 py-1 text-sm font-semibold tabular-nums hover:bg-ice ${balanceMember.balance < 0 ? "text-game" : balanceMember.balance > 0 ? "text-[#1b7a46]" : "text-muted"}`}
            >
              {formatMoney(balanceMember.balance)}
            </button>
            {reservedBalance > 0 ? (
              <button
                type="button"
                onClick={() => setHoldsOpen(true)}
                aria-label={t("finance.reserved", { amount: formatMoney(reservedBalance) })}
                className="block w-full px-2 text-xs font-medium text-muted tabular-nums hover:underline"
              >
                ({formatMoney(reservedBalance)})
              </button>
            ) : null}
          </div>
        ) : null}
        <UserMenu
          name={name}
          account={profile}
          teamCode={team?.code ?? null}
          teamName={team?.name ?? null}
          photoUrl={photoUrl}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={onSettingsOpenChange}
          onSaved={saveAccount}
          calendarIntegration={calendarIntegration}
          entuziasti={entuziasti}
        />
        <IconTipButton label={t("user.logout")} tone="game" onClick={() => void signOut()}>
          <IconLogout />
        </IconTipButton>
        {onOpenAdmin ? (
          <button type="button" aria-label={t("nav.admin")} aria-expanded={adminOpen} onClick={onOpenAdmin} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-ice min-[600px]:hidden">
            {adminOpen ? <IconClose /> : <IconMenu />}
          </button>
        ) : null}
      </div>
      {balanceOpen && balanceMember ? <PlayerBalanceDialog member={balanceMember} teamId={team && !team.demo ? (team.id ?? null) : null} reserved={reservedBalance} onClose={() => setBalanceOpen(false)} /> : null}
      {holdsOpen ? <HoldDialog holds={reservedHolds} onClose={() => setHoldsOpen(false)} /> : null}
    </header>
  );
}

function UserMenu({
  name,
  account,
  teamCode,
  teamName,
  photoUrl,
  settingsOpen = false,
  onSettingsOpenChange,
  onSaved,
  calendarIntegration = false,
  entuziasti = true,
}: {
  name: string;
  account: AccountProfile | null;
  teamCode: string | null;
  teamName: string | null;
  photoUrl: string | null;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  onSaved: (account: Pick<AccountProfile, "firstName" | "lastName" | "ehlPlayers" | "avatarUrl" | "display"> & { eventEmails?: boolean }) => void;
  calendarIntegration?: boolean;
  entuziasti?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow();
  const sheet = usePresence(open && narrow);
  const sheetTop = useHeaderBottom(sheet.mounted, rootRef);
  useExclusiveMobileMenu("user", open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menuItems = (
    <div className="p-1.5">
      <MenuItem
        icon={<IconKey />}
        label={t("user.password")}
        onClick={() => {
          setOpen(false);
          if (account) setPasswordOpen(true);
        }}
      />
      <MenuItem
        icon={<IconSettings />}
        label={t("user.settings")}
        onClick={() => {
          setOpen(false);
          if (account) onSettingsOpenChange?.(true);
        }}
      />
      <MenuItem
        icon={<IconBell />}
        label={t("user.notices")}
        onClick={() => {
          setOpen(false);
          if (account) setNoticesOpen(true);
        }}
      />
      <MenuItem
        icon={<IconShield />}
        label={t("user.twoFactor")}
        onClick={() => {
          setOpen(false);
          if (account) setMfaOpen(true);
        }}
      />
      {calendarIntegration ? (
        <MenuItem
          icon={<IconCalendarLink />}
          label={t("frontend_modules.calendar")}
          onClick={() => {
            setOpen(false);
            if (account) setCalendarOpen(true);
          }}
        />
      ) : null}
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          const next = !open;
          if (next) claimMobileMenu("user");
          else releaseMobileMenu("user");
          setOpen(next);
        }}
        className="inline-flex items-center gap-2 rounded-lg hover:bg-ice min-[600px]:py-1 min-[600px]:pr-2 min-[600px]:pl-1"
      >
        {photoUrl ? (
          <ContentImage src={photoUrl} className="h-9 w-9 rounded-lg bg-ice object-contain object-center" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">{initials(name)}</span>
        )}
        <span className="hidden max-w-36 truncate text-sm font-medium min-[700px]:inline">{name}</span>
      </button>
      {open && !narrow ? (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-64 rounded-xl bg-paper ring-1 ring-line">
          {menuItems}
        </div>
      ) : null}
      {sheet.mounted ? (
        <>
          <button type="button" aria-label={t("event.close")} onClick={() => setOpen(false)} style={{ top: sheetTop }} className={`fixed inset-x-0 bottom-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ${sheet.shown ? "opacity-100" : "pointer-events-none opacity-0"}`} />
          <div style={{ top: sheetTop }} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 overflow-hidden">
            <div role="menu" className={`pointer-events-auto bg-paper shadow-lg transition-transform duration-200 ${sheet.shown ? "translate-y-0" : "-translate-y-full"}`}>
              <p className="truncate px-4 py-2.5 text-sm font-medium">{name}</p>
              <div className="border-b border-line" />
              {menuItems}
            </div>
          </div>
        </>
      ) : null}
      {settingsOpen && account ? (
        <AccountSettingsDialog key={teamCode ?? "account"} account={account} teamCode={teamCode} teamName={teamName} entuziasti={entuziasti} onClose={() => onSettingsOpenChange?.(false)} onSaved={onSaved} />
      ) : null}
      {passwordOpen && account ? <ChangePasswordDialog onClose={() => setPasswordOpen(false)} /> : null}
      {mfaOpen && account ? <MfaSettingsDialog onClose={() => setMfaOpen(false)} /> : null}
      {noticesOpen && account ? (
        <NotificationsDialog
          enabled={account.eventEmails}
          onClose={() => setNoticesOpen(false)}
          onSaved={(eventEmails) => onSaved({ firstName: account.firstName, lastName: account.lastName, ehlPlayers: account.ehlPlayers, avatarUrl: account.avatarUrl, display: account.display, eventEmails })}
        />
      ) : null}
      {calendarOpen && account ? <CalendarExportDialog onClose={() => setCalendarOpen(false)} /> : null}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ice">
      {icon}
      {label}
    </button>
  );
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 6l3 3M14 8l2 2" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

function IconCalendarLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

