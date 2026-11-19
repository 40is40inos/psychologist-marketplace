"use client";

import { savePreferences } from "@/actions/client-profile";
import type { Dictionary } from "@/i18n/get-dictionary";
import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/form";

export function PreferencesForm({
  locale,
  t,
  sessionTypes,
  languages,
  values,
  saved,
  saveError,
}: {
  locale: string;
  t: Dictionary["clientPrefs"];
  sessionTypes: { value: string; label: string }[];
  languages: { value: string; label: string }[];
  values: { preferredLanguage: string; preferredSessionType: string };
  saved: string;
  saveError: string;
}) {
  return (
    <ActionForm action={savePreferences} submitLabel={t.save} savedLabel={saved} errors={{ invalid: saveError }} variant="secondary">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="preferredLanguage" label={t.language}>
          <select id="preferredLanguage" name="preferredLanguage" defaultValue={values.preferredLanguage} className={inputClass}>
            <option value="">{t.any}</option>
            {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
        <Field id="preferredSessionType" label={t.format}>
          <select id="preferredSessionType" name="preferredSessionType" defaultValue={values.preferredSessionType} className={inputClass}>
            <option value="">{t.any}</option>
            {sessionTypes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </div>
    </ActionForm>
  );
}
