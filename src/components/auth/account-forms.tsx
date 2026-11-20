"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  changePassword,
  confirmEmailLink,
  requestEmailChange,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  type SecurityState,
} from "@/actions/account-security";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type T = Dictionary["accountSecurity"];

function NewPasswordFields({ t }: { t: T }) {
  return (
    <>
      <Field id="newPassword" label={t.newPassword} hint={t.passwordHint}>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={200} required className={inputClass} aria-describedby="newPassword-hint" />
      </Field>
      <Field id="confirmPassword" label={t.confirmPassword}>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={200} required className={inputClass} />
      </Field>
    </>
  );
}

/** "Forgot your password?": always the same answer, account or not. */
export function ForgotPasswordForm({ locale, t }: { locale: Locale; t: T }) {
  const [state, action] = useActionState<SecurityState, FormData>(requestPasswordReset, {});
  if (state.ok) return <FormAlert tone="success">{t.forgotSent}</FormAlert>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {state.error && <FormAlert key={state.at}>{t.errors[state.error]}</FormAlert>}
      <Field id="email" label={t.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className={inputClass} />
      </Field>
      <SubmitButton className="w-full">{t.forgotSubmit}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ locale, token, t }: { locale: Locale; token: string; t: T }) {
  const [state, action] = useActionState<SecurityState, FormData>(resetPassword, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      {state.error && <FormAlert key={state.at}>{t.errors[state.error]}</FormAlert>}
      <NewPasswordFields t={t} />
      <SubmitButton className="w-full">{t.resetSubmit}</SubmitButton>
    </form>
  );
}

/** A button (POST), so email scanners that open links can't spend the token. */
export function ConfirmEmailForm({ locale, token, homeHref, t }: { locale: Locale; token: string; homeHref: string; t: T }) {
  const [state, action] = useActionState<SecurityState, FormData>(confirmEmailLink, {});
  if (state.ok) {
    return (
      <div className="space-y-4">
        <FormAlert tone="success">{t.confirmDone}</FormAlert>
        <Link href={homeHref} className="block text-center font-semibold text-primary hover:underline">{t.continue}</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      {state.error && <FormAlert key={state.at}>{t.errors[state.error]}</FormAlert>}
      <SubmitButton className="w-full">{t.confirmSubmit}</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm({ locale, hasPassword, t }: { locale: Locale; hasPassword: boolean; t: T }) {
  return (
    <ActionForm action={changePassword} submitLabel={hasPassword ? t.changePassword : t.setPassword} savedLabel={t.passwordSaved} errors={t.errors} resetOnSuccess>
      <input type="hidden" name="locale" value={locale} />
      {/* Lets password managers attach the new password to the right account. */}
      {hasPassword && (
        <Field id="currentPassword" label={t.currentPassword}>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
      )}
      <NewPasswordFields t={t} />
    </ActionForm>
  );
}

export function ChangeEmailForm({ locale, hasPassword, t }: { locale: Locale; hasPassword: boolean; t: T }) {
  return (
    <ActionForm action={requestEmailChange} submitLabel={t.changeEmail} savedLabel={t.changeEmailSent} errors={t.errors} variant="secondary" resetOnSuccess>
      <input type="hidden" name="locale" value={locale} />
      <Field id="newEmail" label={t.newEmail}>
        <input id="newEmail" name="newEmail" type="email" autoComplete="email" inputMode="email" required maxLength={254} className={inputClass} />
      </Field>
      {hasPassword && (
        <Field id="emailCurrentPassword" label={t.currentPassword}>
          <input id="emailCurrentPassword" name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
      )}
    </ActionForm>
  );
}

export function ResendVerificationForm({ locale, t }: { locale: Locale; t: T }) {
  const [state, action] = useActionState<SecurityState, FormData>(resendVerification, {});
  if (state.ok) return <span role="status" className="text-sm font-medium text-primary">{t.verifySent}</span>;
  return (
    <form action={action} className="inline">
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">{t.verifyResend}</button>
      {state.error && <span role="alert" className="ml-2 text-sm text-accent">{t.errors[state.error]}</span>}
    </form>
  );
}
