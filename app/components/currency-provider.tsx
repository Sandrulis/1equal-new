"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatMoney } from "@/app/lib/format";
import { currencySymbol, DEFAULT_CURRENCY, type CurrencyCode } from "@/app/lib/team-defaults";

const CurrencyContext = createContext<CurrencyCode>(DEFAULT_CURRENCY);

export function CurrencyProvider({ currency, children }: { currency: CurrencyCode; children: ReactNode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function useCurrencyCode(): CurrencyCode {
  return useContext(CurrencyContext);
}

export function useFormatMoney(): (value: number) => string {
  const currency = useCurrencyCode();
  return (value: number) => formatMoney(value, currency);
}

export function useCurrencySymbol(): string {
  return currencySymbol(useCurrencyCode());
}
