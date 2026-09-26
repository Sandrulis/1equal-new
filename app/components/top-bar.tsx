"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccountSettingsDialog } from "@/app/components/account-settings-dialog";
import { IconLogout, IconTipButton } from "@/app/components/icon-tip-button";
import { LanguageMenu } from "@/app/components/language-menu";
import { signOut } from "@/app/lib/auth/actions";
import { accountName, type AccountProfile } from "@/app/lib/auth/profile";
import { CURRENT_USER_ID, MEMBERS } from "@/app/lib/demo-data";
import { useLanguage } from "@/app/lib/language";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TopBar({ onHome, account = null, teamName = null }: { onHome: () => void; account?: AccountProfile | null; teamName?: string | null }) {
  const { t } = useLanguage();
  const demo = MEMBERS.find((member) => member.id === CURRENT_USER_ID) ?? MEMBERS[0];
  const [profile, setProfile] = useState(account);
  const name = profile ? accountName(profile) : demo.name;

  return (
    <header className="sticky top-0 z-30 order-1 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper px-4 sm:px-6 lg:order-none lg:px-8">
      {teamName ? (
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            aria-label={teamName}
            onClick={onHome}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white hover:bg-navy/90"
          >
            {initials(teamName)}
          </button>
          <p className="hidden min-w-0 truncate text-base font-semibold tracking-tight min-[600px]:block">{teamName}</p>
        </div>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <LanguageMenu />
        <UserMenu
          name={name}
          account={profile}
          onSaved={(next) => setProfile((current) => (current ? { ...current, ...next } : current))}
        />
        <IconTipButton label={t("user.logout")} tone="game" onClick={() => void signOut()}>
          <IconLogout />
        </IconTipButton>
      </div>
    </header>
  );
}

function UserMenu({
  name,
  account,
  onSaved,
}: {
  name: string;
  account: AccountProfile | null;
  onSaved: (account: Pick<AccountProfile, "firstName" | "lastName">) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg hover:bg-ice min-[600px]:py-1 min-[600px]:pr-2 min-[600px]:pl-1"
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">
          {initials(name)}
        </span>
        <span className="hidden max-w-36 truncate text-sm font-medium min-[600px]:inline">{name}</span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-56 rounded-xl bg-paper ring-1 ring-line">
          <p className="truncate px-4 py-2.5 text-sm font-medium min-[600px]:hidden">{name}</p>
          <div className="border-b border-line min-[600px]:hidden" />
          <div className="p-1.5">
            <MenuItem icon={<IconKey />} label={t("user.password")} onClick={() => setOpen(false)} />
            <MenuItem
              icon={<IconSettings />}
              label={t("user.settings")}
              onClick={() => {
                setOpen(false);
                if (account) setSettingsOpen(true);
              }}
            />
            <MenuItem icon={<IconShield />} label={t("user.twoFactor")} onClick={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      {settingsOpen && account ? (
        <AccountSettingsDialog account={account} onClose={() => setSettingsOpen(false)} onSaved={onSaved} />
      ) : null}
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

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
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

