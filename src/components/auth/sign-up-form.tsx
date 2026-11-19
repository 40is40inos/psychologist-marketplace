"use client";

import { useActionState, useState } from "react";
import { BadgeCheck, HeartHandshake, Stethoscope } from "lucide-react";
import { signUp, type AuthFormState } from "@/actions/auth";
import type { SignupRole } from "@/domain/roles";
import { PROFESSIONAL_TITLES } from "@/domain/professional-titles";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { describedBy, Field, FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type FieldName = keyof Dictionary["auth"]["fieldErrors"];

export function SignUpForm({
  locale,
  initialRole,
  t,
  titles,
}: {
  locale: Locale;
  initialRole: SignupRole;
  t: Dictionary["auth"];
  titles: Dictionary["titles"];
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

      {state.error && state.error !== "email_taken" && <FormAlert>{t.errors[state.error]}</FormAlert>}

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
          <span>{t.consent}</span>
        </label>
        {err("consent") && <p className="mt-1.5 text-sm text-accent">{err("consent")}</p>}
      </div>

      <SubmitButton className="w-full">{t.submitSignUp}</SubmitButton>
    </form>
  );
}
