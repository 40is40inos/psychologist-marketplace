"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/actions/auth";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { describedBy, Field, FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignInForm({
  locale,
  next,
  t,
}: {
  locale: Locale;
  next?: string;
  t: Dictionary["auth"];
}) {
  const [state, action] = useActionState<AuthFormState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && <FormAlert>{t.errors[state.error]}</FormAlert>}

      <Field id="email" label={t.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.values?.email}
          className={inputClass}
          {...describedBy("email", {})}
        />
      </Field>
      <Field id="password" label={t.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
      <p className="-mt-2 text-right text-sm">
        <Link href={`/${locale}/sign-in/forgot`} className="font-medium text-primary hover:underline">{t.forgotPassword}</Link>
      </p>
      <SubmitButton className="w-full">{t.submitSignIn}</SubmitButton>
    </form>
  );
}
