import { Download, Globe2 } from "lucide-react";
import { setConsent } from "@/actions/privacy";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { buttonClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteAccountForm } from "./delete-account-form";
import { isDemoAccount } from "@/config/demo";
import { CookieChoice } from "./cookie-choice";

/** Consents, data export and deletion. Shared by the client account and the security page. */
export async function PrivacyCenter({ user, locale, dict }: { user: CurrentUser; locale: Locale; dict: Dictionary }) {
  const t = dict.privacyCenter;
  const records = await db.consentRecord.findMany({ where: { userId: user.id }, orderBy: { grantedAt: "desc" } });
  // Latest record per kind.
  const latest = new Map<string, (typeof records)[number]>();
  for (const r of records) if (!latest.has(r.kind)) latest.set(r.kind, r);
  const revocable = new Set(["health_data", "optional_cookies"]);
  const kinds = (user.role === "client" ? ["terms", "privacy", "health_data"] : ["psychologist_terms", "privacy"]) as (keyof typeof t.kinds)[];

  return (
    <div className="space-y-8">
      <p className="flex items-center gap-2 text-sm text-muted"><Globe2 className="size-4" aria-hidden="true" />{t.residency}</p>

      <section aria-labelledby="consents" className="space-y-3">
        <h2 id="consents" className="text-lg font-semibold text-ink">{t.consents}</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {kinds.map((kind) => {
            const r = latest.get(kind);
            const active = r && !r.withdrawnAt;
            return (
              <li key={kind} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{t.kinds[kind]}</p>
                  <p className="text-sm text-muted">
                    {r ? (active ? fill(t.consentGiven, { date: formatShortDate(r.grantedAt, locale), version: r.version }) : fill(t.consentWithdrawn, { date: formatShortDate(r.withdrawnAt!, locale) })) : "—"}
                  </p>
                  {kind === "health_data" && !active && <p className="mt-1 text-sm text-accent">{t.healthWithdrawNote}</p>}
                </div>
                {revocable.has(kind) && (
                  <form action={setConsent}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="kind" value={kind} />
                    <input type="hidden" name="grant" value={active ? "0" : "1"} />
                    <SubmitButton variant={active ? "danger" : "secondary"}>{active ? t.withdraw : t.grant}</SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <CookieChoice t={dict.cookies} />

      <section aria-labelledby="export" className="space-y-2">
        <h2 id="export" className="text-lg font-semibold text-ink">{t.export}</h2>
        <p className="text-sm text-muted">{t.exportHint}</p>
        {/* A file download from an API route, not a page navigation. */}
        <a href="/api/account/export" download className={buttonClass.secondary}><Download className="size-4" aria-hidden="true" />{t.export}</a>
      </section>

      {user.role === "client" && (
        <section aria-labelledby="delete" className="space-y-2 rounded-2xl border border-accent/30 bg-accent-soft/40 p-5">
          <h2 id="delete" className="text-lg font-semibold text-ink">{t.delete}</h2>
          <p className="text-sm text-ink">{t.deleteHint}</p>
          {isDemoAccount(user.email) ? <p className="text-sm text-muted">{dict.accountSecurity.demoLocked}</p> : <DeleteAccountForm locale={locale} t={t} />}
        </section>
      )}
    </div>
  );
}
