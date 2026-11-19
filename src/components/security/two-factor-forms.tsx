"use client";

import { useActionState, useState } from "react";
import { enableTwoFactor, regenerateRecoveryCodes, verifySignIn, type TwoFactorState } from "@/actions/two-factor";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Field, FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type T = Dictionary["twoFactor"];
const errorText = (t: T, e?: TwoFactorState["error"]) => (e === "expired" ? t.expired : e === "tooMany" ? t.tooMany : e ? t.invalid : null);

function RecoveryCodes({ codes, t }: { codes: string[]; t: T }) {
  return (
    <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary-soft p-4">
      <h3 className="font-semibold text-ink">{t.recoveryTitle}</h3>
      <p className="text-sm text-ink">{t.recoveryHint}</p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm text-ink sm:grid-cols-5">
        {codes.map((c) => <li key={c} className="rounded bg-surface px-2 py-1 text-center">{c}</li>)}
      </ul>
    </div>
  );
}

export function EnableForm({ locale, t }: { locale: string; t: T }) {
  const [state, action] = useActionState<TwoFactorState, FormData>(enableTwoFactor, {});
  if (state.recoveryCodes) {
    return (
      <div className="space-y-4">
        <FormAlert tone="success">{t.enabled}</FormAlert>
        <RecoveryCodes codes={state.recoveryCodes} t={t} />
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <Field id="code" label={t.step2}>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className={`${inputClass} max-w-40 font-mono text-lg tracking-widest`} aria-label={t.code} />
      </Field>
      {errorText(t, state.error) && <FormAlert>{errorText(t, state.error)}</FormAlert>}
      <SubmitButton>{t.enable}</SubmitButton>
    </form>
  );
}

export function RegenerateForm({ locale, t }: { locale: string; t: T }) {
  const [state, action] = useActionState<TwoFactorState, FormData>(regenerateRecoveryCodes, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      {state.recoveryCodes && <RecoveryCodes codes={state.recoveryCodes} t={t} />}
      <SubmitButton variant="secondary">{t.regenerate}</SubmitButton>
    </form>
  );
}

export function VerifyForm({ locale, next, t }: { locale: string; next?: string; t: T }) {
  const [state, action] = useActionState<TwoFactorState, FormData>(verifySignIn, {});
  const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {errorText(t, state.error) && <FormAlert>{errorText(t, state.error)}</FormAlert>}
      {recovery ? (
        <Field id="recovery" label={t.recoveryCode}>
          <input id="recovery" name="recovery" autoComplete="off" required className={`${inputClass} font-mono`} placeholder="xxxx-xxxx" />
        </Field>
      ) : (
        <Field id="code" label={t.code}>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus className={`${inputClass} font-mono text-lg tracking-widest`} />
        </Field>
      )}
      <SubmitButton className="w-full">{t.verify}</SubmitButton>
      <button type="button" onClick={() => setRecovery((r) => !r)} className="text-sm font-medium text-primary hover:underline">
        {recovery ? t.code : t.useRecovery}
      </button>
    </form>
  );
}
