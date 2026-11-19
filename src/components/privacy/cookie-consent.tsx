"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { CONSENT_COOKIE } from "@/config/legal";

/**
 * Cookie consent. Only essential cookies are set without asking (session,
 * language). Optional third-party content (map tiles, embedded videos) loads
 * only after consent, which is stored in a first-party cookie for a year.
 */
const EVENT = "cookie-consent-change";

function read(): "all" | "essential" | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(all|essential)`));
  return (m?.[1] as "all" | "essential") ?? null;
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useCookieConsent() {
  // Server and first client render: treat as "unknown" (no banner flash, no optional content).
  return useSyncExternalStore(subscribe, read, () => "pending" as const);
}

export function setCookieConsent(value: "all" | "essential") {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
}

export function CookieBanner({ t, policyHref }: { t: { title: string; body: string; essential: string; all: string; more: string }; policyHref: string }) {
  const consent = useCookieConsent();
  if (consent !== null) return null;
  return (
    <div role="region" aria-labelledby="cookie-title" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 print:hidden">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-4 shadow-lg sm:p-5">
        <h2 id="cookie-title" className="flex items-center gap-2 font-semibold text-ink">
          <Cookie className="size-5 text-primary" aria-hidden="true" />
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-ink">
          {t.body}{" "}
          <Link href={policyHref} className="font-medium text-primary underline underline-offset-2">{t.more}</Link>
        </p>
        {/* Equal-weight choices: refusing is as easy as accepting. */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCookieConsent("essential")} className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-4 font-semibold text-ink hover:border-primary">
            {t.essential}
          </button>
          <button type="button" onClick={() => setCookieConsent("all")} className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-4 font-semibold text-ink hover:border-primary">
            {t.all}
          </button>
        </div>
      </div>
    </div>
  );
}
