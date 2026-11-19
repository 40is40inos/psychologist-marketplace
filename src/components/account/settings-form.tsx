"use client";

import { saveReminderSettings, type SimpleState } from "@/actions/account";
import type { Dictionary } from "@/i18n/get-dictionary";
import { describedBy, Field, FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useKeepValuesAction } from "@/components/ui/use-keep-values-action";

export function SettingsForm({
  locale,
  values,
  t,
}: {
  locale: string;
  values: { phone: string; emailReminders: boolean; smsReminders: boolean };
  t: Dictionary["account"];
}) {
  const { state, onSubmit, isPending } = useKeepValuesAction<SimpleState>(saveReminderSettings, {});
  const phoneError = state.error === "phone" ? t.phoneInvalid : undefined;

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
        <input type="checkbox" name="emailReminders" defaultChecked={values.emailReminders} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span className="text-ink">{t.emailReminders}</span>
      </label>
      <label className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
        <input type="checkbox" name="smsReminders" defaultChecked={values.smsReminders} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span className="text-ink">{t.smsReminders}</span>
      </label>
      <Field id="phone" label={t.phone} hint={t.phoneHint} error={phoneError}>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={values.phone} className={inputClass} {...describedBy("phone", { error: phoneError, hint: t.phoneHint })} />
      </Field>
      <div className="flex items-center gap-4">
        <SubmitButton pending={isPending}>{t.saveSettings}</SubmitButton>
        {state.ok && <span key={state.at} role="status" className="text-sm font-medium text-primary">{t.settingsSaved}</span>}
      </div>
      {phoneError && <FormAlert>{phoneError}</FormAlert>}
    </form>
  );
}
