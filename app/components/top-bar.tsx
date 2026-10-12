"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ContentImage } from "@/app/components/content-image";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { AccountSettingsDialog } from "@/app/components/account-settings-dialog";
import { CalendarExportDialog } from "@/app/components/calendar-export-dialog";
import { MfaSettingsDialog } from "@/app/components/mfa-settings-dialog";
import { NotificationsDialog } from "@/app/components/notifications-dialog";
import { ChangePasswordDialog } from "@/app/components/change-password-dialog";
import { IconLogout } from "@/app/components/icon-tip-button";
import { LanguageMenu } from "@/app/components/language-menu";
import { PlayerBalanceDialog } from "@/app/components/player-profile";
import type { BalanceHold } from "@/app/components/team-roster";
import type { IssuedTeam } from "@/app/lib/invite-code";
import { signOut } from "@/app/lib/auth/actions";
import { accountName, type AccountProfile } from "@/app/lib/auth/profile";
import type { Member } from "@/app/lib/demo-data";
import { CURRENT_USER_ID } from "@/app/lib/demo-constants";
import { useFormatMoney } from "@/app/components/currency-provider";
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

export function MemberBalance({
  member,
  team = null,
  reservedHolds = [],
  compact = false,
  header = false,
}: {
  member: Member;
  team?: Pick<IssuedTeam, "id" | "demo"> | null;
  reservedHolds?: BalanceHold[];
  compact?: boolean;
  header?: boolean;
}) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const reservedBalance = Math.round(reservedHolds.reduce((sum, hold) => sum + hold.amount, 0) * 100) / 100;
  const amount = formatMoney(member.balance);
  const tone = member.balance < 0 ? "text-game" : member.balance > 0 ? "text-[#1b7a46]" : "text-muted";
  const label = `${t("roster.balance.player")} ${amount}`;

  return (
    <>
      {header ? (
        <button type="button" aria-label={label} onClick={() => setBalanceOpen(true)} className={`max-w-28 truncate text-sm font-semibold tabular-nums ${tone}`}>
          {amount}
        </button>
      ) : null}
      {header ? null : <div className="mb-2.5">
        <button
          type="button"
          aria-label={label}
          onClick={() => setBalanceOpen(true)}
          className={`flex w-full min-w-0 items-center gap-2 rounded-xl text-left hover:bg-paper ${compact ? "justify-center" : ""}`}
        >
          <span className={`inline-grid h-9 w-9 shrink-0 place-items-center text-ink [&_svg]:h-5 [&_svg]:w-5 ${compact ? tone : ""}`}>
            <IconWallet />
          </span>
          <span className={`min-w-0 truncate text-sm font-semibold tabular-nums ${tone} ${compact ? "sr-only" : ""}`}>{amount}</span>
        </button>
        {reservedBalance > 0 ? (
          <button
            type="button"
            onClick={() => setHoldsOpen(true)}
            aria-label={t("finance.reserved", { amount: formatMoney(reservedBalance) })}
            className={`block w-full font-medium text-muted tabular-nums hover:underline ${compact ? "text-center text-[10px]" : "pl-11 text-left text-xs"}`}
          >
            ({formatMoney(reservedBalance)})
          </button>
        ) : null}
      </div>}
      {balanceOpen ? <PlayerBalanceDialog member={member} teamId={team && !team.demo ? (team.id ?? null) : null} reserved={reservedBalance} onClose={() => setBalanceOpen(false)} /> : null}
      {holdsOpen ? <HoldDialog holds={reservedHolds} onClose={() => setHoldsOpen(false)} /> : null}
    </>
  );
}

export function TopBar({
  onOpenMenu,
  menuOpen = false,
  onOpenAdmin,
  adminOpen = false,
  leading = null,
  trailing = null,
}: {
  onOpenMenu?: () => void;
  menuOpen?: boolean;
  onOpenAdmin?: () => void;
  adminOpen?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const { t } = useLanguage();
  const brand = useSiteBrand();

  return (
    <header className="fixed inset-x-0 top-0 z-[60] flex h-14 items-center justify-between gap-2.5 border-b border-line bg-paper px-2.5 min-[600px]:hidden">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMenu ? (
          <button type="button" aria-label={t("nav.sections")} aria-expanded={menuOpen} onClick={onOpenMenu} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-ice min-[600px]:hidden">
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        ) : null}
        {menuOpen ? (
          <span className="flex min-w-0 items-center gap-2 min-[600px]:hidden">
            {brand.logoUrl ? <ContentImage src={brand.logoUrl} className="h-7 w-auto shrink-0" /> : null}
            <span className="truncate text-base font-semibold tracking-wide">{brand.name}</span>
          </span>
        ) : null}
        {leading}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {trailing}
        {onOpenAdmin ? (
          <button type="button" aria-label={t("nav.admin")} aria-expanded={adminOpen} onClick={onOpenAdmin} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-ice min-[600px]:hidden">
            {adminOpen ? <IconClose /> : <IconMenu />}
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function UserMenu({
  name,
  account,
  photoUrl,
  settingsOpen = false,
  onSettingsOpenChange,
  onSaved,
  calendarIntegration = false,
  sidebar = false,
  compact = false,
}: {
  name: string;
  account: AccountProfile | null;
  photoUrl: string | null;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  onSaved: (account: Pick<AccountProfile, "firstName" | "lastName" | "ehlPlayers" | "avatarUrl" | "display"> & { eventEmails?: boolean; eventReminder?: string; phone?: string; hasPassword?: boolean }) => void;
  calendarIntegration?: boolean;
  sidebar?: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [demoName, setDemoName] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [languageSlot, setLanguageSlot] = useState<HTMLDivElement | null>(null);
  const narrow = useNarrow();
  const sheet = usePresence(open && narrow && !sidebar);
  const sheetTop = useHeaderBottom(sheet.mounted, rootRef);
  useExclusiveMobileMenu("user", open && !sidebar, () => setOpen(false));
  useEffect(() => {
    if (account || name) return;
    let active = true;
    void import("@/app/lib/demo-data").then((mod) => {
      if (!active) return;
      const demo = mod.MEMBERS.find((member) => member.id === CURRENT_USER_ID) ?? mod.MEMBERS[0];
      setDemoName(demo?.name ?? "");
    });
    return () => {
      active = false;
    };
  }, [account, name]);
  const label = name || (account ? accountName(account) : demoName);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-language-popover]")) return;
      if (rootRef.current?.contains(target as Node) || menuRef.current?.contains(target as Node)) return;
      setOpen(false);
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

  const placedMenu = open && sidebar ? menuPos : null;

  useLayoutEffect(() => {
    if (!open || !sidebar) return;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, 256);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
      const height = menu?.height ?? 0;
      let top = rect.top - 4 - height;
      if (!height || top < 8) top = Math.max(8, rect.bottom + 4);
      if (height && top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
      setMenuPos({ top, left, width });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, sidebar, compact]);

  const menuItems = (
    <div className="p-1.5">
      <MenuItem
        icon={<IconKey />}
        label={t(account?.hasPassword === false ? "user.password.set" : "user.password")}
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
      <div className="my-1 border-t border-line" />
      <div ref={setLanguageSlot} />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          void signOut();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-game hover:bg-ice"
      >
        <IconLogout />
        {t("user.logout")}
      </button>
    </div>
  );

  const menuPanel = open && sidebar ? (
    <div
      ref={menuRef}
      role="menu"
      style={{ top: placedMenu?.top ?? -9999, left: placedMenu?.left ?? 0, width: placedMenu?.width ?? 256, visibility: placedMenu ? "visible" : "hidden" }}
      className="fixed z-[70] max-h-[min(24rem,calc(100dvh-1rem))] overflow-y-auto rounded-xl bg-paper shadow-lg ring-1 ring-line"
    >
      {menuItems}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={sidebar ? "min-w-0" : "relative"}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        title={sidebar && compact ? label : undefined}
        onClick={() => {
          const next = !open;
          if (!sidebar) {
            if (next) claimMobileMenu("user");
            else releaseMobileMenu("user");
          }
          setOpen(next);
        }}
        className={sidebar ? `flex w-full min-w-0 items-center gap-2 rounded-xl text-left hover:bg-paper ${compact ? "justify-center" : ""}` : "inline-flex h-9 items-center gap-1.5 rounded-lg py-0 pr-2.5 pl-0 hover:bg-ice"}
      >
        {photoUrl ? (
          <ContentImage src={photoUrl} className="h-9 w-9 shrink-0 rounded-lg bg-ice object-contain object-center" />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">{initials(label)}</span>
        )}
        <span className={sidebar ? `min-w-0 flex-1 truncate text-sm font-medium ${compact ? "sr-only" : ""}` : "hidden max-w-36 truncate text-sm font-medium min-[700px]:inline"}>{label}</span>
        {!(sidebar && compact) ? (
          <span aria-hidden className={sidebar ? "mr-2 grid size-5 shrink-0 place-items-center rounded-md bg-paper text-ink ring-1 ring-line" : "grid size-5 shrink-0 place-items-center rounded-md bg-paper text-ink ring-1 ring-line"}>
            <IconChevronsUpDown />
          </span>
        ) : null}
      </button>
      {menuPanel && typeof document !== "undefined" ? createPortal(menuPanel, document.body) : null}
      {open && !narrow && !sidebar ? (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-64 rounded-xl bg-paper ring-1 ring-line">
          {menuItems}
        </div>
      ) : null}
      {sheet.mounted ? (
        <>
          <button type="button" aria-label={t("event.close")} onClick={() => setOpen(false)} style={{ top: sheetTop }} className={`fixed inset-x-0 bottom-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ${sheet.shown ? "opacity-100" : "pointer-events-none opacity-0"}`} />
          <div style={{ top: sheetTop }} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 overflow-hidden">
            <div role="menu" className={`pointer-events-auto bg-paper shadow-lg transition-transform duration-200 ${sheet.shown ? "translate-y-0" : "-translate-y-full"}`}>
              <p className="truncate px-4 py-2.5 text-sm font-medium">{label}</p>
              <div className="border-b border-line" />
              {menuItems}
            </div>
          </div>
        </>
      ) : null}
      <LanguageMenu embedded slot={languageSlot} docked={sidebar} />
      {settingsOpen && account ? (
        <AccountSettingsDialog account={account} onClose={() => onSettingsOpenChange?.(false)} onSaved={onSaved} />
      ) : null}
      {passwordOpen && account ? (
        <ChangePasswordDialog
          hasPassword={account.hasPassword}
          onClose={() => setPasswordOpen(false)}
          onSaved={() => onSaved({ firstName: account.firstName, lastName: account.lastName, ehlPlayers: account.ehlPlayers, avatarUrl: account.avatarUrl, display: account.display, hasPassword: true })}
        />
      ) : null}
      {mfaOpen && account ? <MfaSettingsDialog onClose={() => setMfaOpen(false)} /> : null}
      {noticesOpen && account ? (
        <NotificationsDialog
          enabled={account.eventEmails}
          reminder={account.eventReminder}
          onClose={() => setNoticesOpen(false)}
          onSaved={(patch) => onSaved({ firstName: account.firstName, lastName: account.lastName, ehlPlayers: account.ehlPlayers, avatarUrl: account.avatarUrl, display: account.display, ...patch })}
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

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChevronsUpDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6.5 8 3.5 12 6.5" />
      <path d="M4 9.5 8 12.5 12 9.5" />
    </svg>
  );
}

