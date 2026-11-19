"use client";

import { Check } from "lucide-react";
import { setCookieConsent, useCookieConsent } from "./cookie-consent";

/** Change the cookie banner choice later (consent must be as easy to withdraw as to give). */
export function CookieChoice({ t }: { t: { title: string; essential: string; all: string } }) {
  const consent = useCookieConsent();
  const options = [
    ["essential", t.essential],
    ["all", t.all],
  ] as const;
  return (
    <section aria-labelledby="cookie-choice" className="space-y-3">
      <h2 id="cookie-choice" className="text-lg font-semibold text-ink">{t.title}</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="cookie-choice">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={consent === value}
            onClick={() => setCookieConsent(value)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold text-ink hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary-soft/50"
          >
            {consent === value && <Check className="size-4 text-primary" aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
