"use client";

import { saveProfile, type SaveState } from "@/actions/psychologist";
import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { fill } from "@/lib/format";
import { Field, FormAlert, inputClass, textareaClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useKeepValuesAction } from "@/components/ui/use-keep-values-action";

export interface ProfileFormData {
  practisingSince: number | null;
  sessionLanguages: string[];
  published: boolean;
  translations: Partial<Record<Locale, { headline: string; bio: string; approach: string | null }>>;
}

const SESSION_LANGUAGES = ["el", "en", "fr", "de"] as const;

export function ProfileForm({
  data,
  t,
  languages,
}: {
  data: ProfileFormData;
  t: Dictionary["dashboard"];
  languages: Dictionary["languages"];
}) {
  const { state, onSubmit, isPending } = useKeepValuesAction<SaveState>(saveProfile, {});

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-6">
      {locales.map((locale) => {
        const tr = data.translations[locale];
        return (
          <fieldset key={locale} className="space-y-4 rounded-2xl border border-border p-4 sm:p-5" lang={locale}>
            <legend className="px-1 text-sm font-semibold text-ink">
              {fill(t.textIn, { language: languages[locale] })}
            </legend>
            <Field id={`headline_${locale}`} label={t.headline} hint={t.headlineHint}>
              <input id={`headline_${locale}`} name={`headline_${locale}`} maxLength={120} defaultValue={tr?.headline} className={inputClass} />
            </Field>
            <Field id={`bio_${locale}`} label={t.bio}>
              <textarea id={`bio_${locale}`} name={`bio_${locale}`} maxLength={3000} rows={5} defaultValue={tr?.bio} className={textareaClass} />
            </Field>
            <Field id={`approach_${locale}`} label={t.approach}>
              <textarea id={`approach_${locale}`} name={`approach_${locale}`} maxLength={2000} rows={3} defaultValue={tr?.approach ?? ""} className={textareaClass} />
            </Field>
          </fieldset>
        );
      })}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="practisingSince" label={t.practisingSince}>
          <input id="practisingSince" name="practisingSince" inputMode="numeric" pattern="\d{4}" maxLength={4} defaultValue={data.practisingSince ?? ""} className={inputClass} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t.sessionLanguages}</legend>
          <div className="flex flex-wrap gap-2">
            {SESSION_LANGUAGES.map((code) => (
              <label key={code} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50">
                <input type="checkbox" name="sessionLanguages" value={code} defaultChecked={data.sessionLanguages.includes(code)} className="size-4 accent-[var(--primary)]" />
                {languages[code]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="flex gap-3 rounded-2xl border border-border p-4">
        <input type="checkbox" name="published" defaultChecked={data.published} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span>
          <span className="block font-medium text-ink">{t.published}</span>
          <span className="block text-sm text-muted">{t.publishedHint}</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={isPending}>{t.save}</SubmitButton>
        {state.ok && <span key={state.at} role="status" className="text-sm font-medium text-primary">{t.saved}</span>}
      </div>
      {state.error && <FormAlert>{t.saveError}</FormAlert>}
    </form>
  );
}
