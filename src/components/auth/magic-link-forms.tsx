"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { consumeMagicLink, requestMagicLink, type MagicLinkState } from "@/actions/magic-link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Field, FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

/** "Email me a sign-in link", shown under the password form. */
export function MagicLinkRequest({ locale, next, t }: { locale: Locale; next?: string; t: Dictionary["magicLink"] }) {
  const [state, action] = useActionState<MagicLinkState, FormData>(requestMagicLink, {});
  if (state.sent) return <FormAlert tone="success">{t.sent}</FormAlert>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <p className="text-sm text-muted">{t.intro}</p>
      {state.error && <FormAlert>{t.errors[state.error]}</FormAlert>}
      <Field id="magic-email" label={t.email}>
        <input id="magic-email" name="email" type="email" autoComplete="email" inputMode="email" required className={inputClass} />
      </Field>
      <SubmitButton variant="secondary" className="w-full">
        <Mail className="size-4" aria-hidden="true" />
        {t.send}
      </SubmitButton>
    </form>
  );
}

/** Confirmation page: a button (POST), so email scanners that open links can't use the token up. */
export function MagicLinkConfirm({ locale, token, next, t }: { locale: Locale; token: string; next?: string; t: Dictionary["magicLink"] }) {
  const [state, action] = useActionState<MagicLinkState, FormData>(consumeMagicLink, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <FormAlert>{t.errors[state.error]}</FormAlert>}
      <SubmitButton className="w-full">{t.confirm}</SubmitButton>
    </form>
  );
}
