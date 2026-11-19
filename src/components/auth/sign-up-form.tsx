"use client";

import { useActionState, useState } from "react";
import { BadgeCheck, HeartHandshake, Stethoscope } from "lucide-react";
import { signUp, type AuthFormState } from "@/actions/auth";
import { startGoogle } from "@/actions/google";
import { GoogleMark } from "@/components/auth/google-button";
import type { SignupRole } from "@/domain/roles";
import { PROFESSIONAL_TITLES } from "@/domain/professional-titles";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { describedBy, Field, FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { LEGAL_PAGES } from "@/config/legal";

type FieldName = keyof Dictionary["auth"]["fieldErrors"];

export function SignUpForm({
  locale,
  initialRole,
  next,
  t,
  titles,
  legal,
  google,
  notice,
}: {
  locale: Locale;
  initialRole: SignupRole;
  next?: string;
  t: Dictionary["auth"];
  titles: Dictionary["titles"];
  legal: Dictionary["legal"];
  /** Shown when Google sign-in is configured. */
  google?: { label: string; or: string; hint: string };
  /** Message carried back from the Google flow (e.g. consent missing). */
  notice?: string;
}) {
  const [state, action] = useActionState<AuthFormState, FormData>(signUp, {});
  const [role, setRole] = useState<SignupRole>(
    (state.values?.role as SignupRole | undefined) ?? initialRole,
  );
  const v = state.values ?? {};
  const err = (name: FieldName) => (state.fieldErrors?.[name] ? t.fieldErrors[name] : undefined);

  const roles = [
    { value: "client" as const, icon: HeartHandshake, ...t.roleClient },
    { value: "psychologist" as const, icon: Stethoscope, ...t.rolePsychologist },
  ];

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && state.error !== "email_taken" && <FormAlert>{t.errors[state.error]}</FormAlert>}
      {notice && !state.error && <FormAlert>{notice}</FormAlert>}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">{t.iAm}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map(({ value, icon: Icon, title, body }) => (
            <label
              key={value}
              className="flex cursor-pointer gap-3 rounded-xl border border-border bg-surface p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30"
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-ink">{title}</span>
                <span className="block text-sm text-muted">{body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="name" label={t.name} error={err("name")}>
        <input id="name" name="name" autoComplete="name" required defaultValue={v.name} className={inputClass} {...describedBy("name", { error: err("name") })} />
      </Field>
      <Field id="email" label={t.email} error={state.error === "email_taken" ? t.errors.email_taken : err("email")}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={v.email} className={inputClass} {...describedBy("email", { error: err("email") })} />
      </Field>
      <Field id="password" label={t.password} hint={t.passwordHint} error={err("password")}>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className={inputClass} {...describedBy("password", { error: err("password"), hint: t.passwordHint })} />
      </Field>

      {role === "psychologist" && (
        <div className="space-y-5 rounded-2xl border border-border bg-surface-muted/60 p-4 sm:p-5">
          <Field id="title" label={t.professionalTitle} error={err("title")}>
            <select id="title" name="title" required defaultValue={v.title ?? ""} className={`${inputClass} appearance-none`} {...describedBy("title", { error: err("title") })}>
              <option value="" disabled>
                —
              </option>
              {PROFESSIONAL_TITLES.map((title) => (
                <option key={title} value={title}>
                  {titles[title]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="licenseNumber" label={t.licenseNumber} hint={t.licenseNumberHint} error={err("licenseNumber")}>
            <input id="licenseNumber" name="licenseNumber" required defaultValue={v.licenseNumber} className={inputClass} {...describedBy("licenseNumber", { error: err("licenseNumber"), hint: t.licenseNumberHint })} />
          </Field>
          <Field id="licensingAuthority" label={t.licensingAuthority} hint={t.licensingAuthorityHint} error={err("licensingAuthority")}>
            <input id="licensingAuthority" name="licensingAuthority" required defaultValue={v.licensingAuthority} className={inputClass} {...describedBy("licensingAuthority", { error: err("licensingAuthority"), hint: t.licensingAuthorityHint })} />
          </Field>
          <p className="flex gap-2 text-sm text-muted">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {t.verificationNote}
          </p>
        </div>
      )}

      <div>
        <label className="flex gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={v.consent === "on"}
            className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
            aria-invalid={err("consent") ? true : undefined}
          />
          <span>
            <LegalSentence template={role === "psychologist" ? legal.agreePsychologist : legal.agreeClient} legal={legal} locale={locale} psychologist={role === "psychologist"} />
          </span>
        </label>
        {err("consent") && <p className="mt-1.5 text-sm text-accent">{err("consent")}</p>}
      </div>

      {/* Health data is a special category (GDPR Art. 9): explicit, separate consent. */}
      {role === "client" && (
        <div>
          <label className="flex gap-3 text-sm text-ink">
            <input type="checkbox" name="healthConsent" required defaultChecked={v.healthConsent === "on"} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" aria-invalid={err("consent") ? true : undefined} />
            <span>{legal.healthConsent}</span>
          </label>
        </div>
      )}

      <SubmitButton className="w-full">{t.submitSignUp}</SubmitButton>

      {google && role === "client" && (
        <div className="space-y-2">
          <p className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{google.or}</p>
          {/* Same form, so the consent checkboxes above travel with it. */}
          <button type="submit" formAction={startGoogle} formNoValidate name="intent" value="signup" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold text-ink transition-colors hover:border-primary">
            <GoogleMark />
            {google.label}
          </button>
          <p className="text-center text-xs text-muted">{google.hint}</p>
        </div>
      )}
    </form>
  );
}

/** "I agree to the {terms}, the {cancellation} and the {privacy}." with links (new tab, so the form isn't lost). */
function LegalSentence({ template, legal, locale, psychologist }: { template: string; legal: Dictionary["legal"]; locale: Locale; psychologist: boolean }) {
  const links: Record<string, [string, string]> = {
    terms: [psychologist ? legal.termsPsychologists : legal.terms, psychologist ? LEGAL_PAGES.termsPsychologists : LEGAL_PAGES.terms],
    cancellation: [legal.cancellation, LEGAL_PAGES.cancellation],
    privacy: [legal.privacy, LEGAL_PAGES.privacy],
  };
  return (
    <>
      {template.split(/(\{\w+\})/g).map((part, i) => {
        const key = part.slice(1, -1);
        if (part.startsWith("{") && links[key]) {
          const [label, slug] = links[key];
          return (
            <a key={i} href={`/${locale}/p/${slug}`} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">
              {label}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}
