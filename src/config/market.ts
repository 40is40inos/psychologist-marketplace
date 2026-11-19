/**
 * Market configuration. Greece is the launch market; other EU countries
 * are added as entries here (plus a locale in src/i18n/config.ts if they
 * need a new language). Nothing else in the app hardcodes a country.
 */
/** Add a country code here when a new market launches, e.g. "GR" | "CY". */
export type CountryCode = "GR";

export interface MarketConfig {
  country: CountryCode;
  currency: "EUR";
  timeZone: string;
  phonePrefix: string;
  enabled: boolean;
  /** Crisis lines shown on every page. Numbers must be verified per country. */
  crisisLines: {
    emergency: string;
    suicide: string;
    mentalHealth: string;
  };
}

export const markets: Record<CountryCode, MarketConfig> = {
  GR: {
    country: "GR",
    currency: "EUR",
    timeZone: "Europe/Athens",
    phonePrefix: "+30",
    enabled: true,
    crisisLines: {
      emergency: "112",
      suicide: "1018",
      mentalHealth: "10306",
    },
  },
};

export const DEFAULT_MARKET: CountryCode = "GR";
export const currentMarket = markets[DEFAULT_MARKET];
export const CURRENCY = "EUR" as const;
