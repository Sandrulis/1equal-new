"use client";

import { CURRENCIES, currencySymbol, type CurrencyCode } from "@/app/lib/team-defaults";
import { useLanguage } from "@/app/lib/language";

const fieldClass = "mt-1.5 w-full rounded-lg bg-ice px-3 py-2 text-sm font-normal text-ink ring-1 ring-line outline-none focus:ring-train disabled:cursor-not-allowed disabled:opacity-60";

export function MoneyVotingFields({
  idPrefix,
  currency,
  trainingHours,
  gameHours,
  systemCurrency,
  allowSystemCurrency = false,
  disabled = false,
  onCurrency,
  onTrainingHours,
  onGameHours,
}: {
  idPrefix: string;
  currency: string | null;
  trainingHours: string;
  gameHours: string;
  systemCurrency: CurrencyCode;
  allowSystemCurrency?: boolean;
  disabled?: boolean;
  onCurrency: (value: string | null) => void;
  onTrainingHours: (value: string) => void;
  onGameHours: (value: string) => void;
}) {
  const { t } = useLanguage();
  const systemLabel = t("profile.display.system_default", { value: `${systemCurrency} (${currencySymbol(systemCurrency)})` });

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium" htmlFor={`${idPrefix}-currency`}>
        {t("site_settings.form.currency")}
        <select
          id={`${idPrefix}-currency`}
          name="currency"
          disabled={disabled}
          value={currency ?? ""}
          onChange={(event) => onCurrency(event.target.value || null)}
          className={fieldClass}
        >
          {allowSystemCurrency ? <option value="">{systemLabel}</option> : null}
          {CURRENCIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} ({item.symbol})
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs font-normal text-muted">
          {allowSystemCurrency ? t("team.currency.hint") : t("site_settings.form.currency_hint")}
        </span>
      </label>
      <div>
        <p className="text-sm font-medium">{t("team.voting.title")}</p>
        <div className="mt-3 grid grid-cols-2 items-start gap-3">
          <label className="block text-sm font-medium" htmlFor={`${idPrefix}-training`}>
            <span className="font-normal text-muted">{t("team.voting.training")}</span>
            <input
              id={`${idPrefix}-training`}
              name="trainingVotingHours"
              required
              type="number"
              min={1}
              max={168}
              step={1}
              disabled={disabled}
              value={trainingHours}
              onChange={(event) => onTrainingHours(event.target.value)}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs font-normal text-muted">{t("team.voting.training.help")}</span>
          </label>
          <label className="block text-sm font-medium" htmlFor={`${idPrefix}-game`}>
            <span className="font-normal text-muted">{t("team.voting.game")}</span>
            <input
              id={`${idPrefix}-game`}
              name="gameVotingHours"
              required
              type="number"
              min={1}
              max={168}
              step={1}
              disabled={disabled}
              value={gameHours}
              onChange={(event) => onGameHours(event.target.value)}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs font-normal text-muted">{t("team.voting.game.help")}</span>
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">{allowSystemCurrency ? t("team.voting.help") : t("site_settings.form.voting_hint")}</p>
      </div>
    </div>
  );
}
