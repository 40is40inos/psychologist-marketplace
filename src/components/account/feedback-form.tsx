"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { submitFeedback, type SimpleState } from "@/actions/account";
import type { Dictionary } from "@/i18n/get-dictionary";
import { FormAlert, textareaClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function FeedbackForm({ appointmentId, locale, t, allowPublic = false }: { appointmentId: string; locale: string; t: Dictionary["account"]; allowPublic?: boolean }) {
  const [state, action] = useActionState<SimpleState, FormData>(submitFeedback, {});
  if (state.ok) return <FormAlert tone="success">{t.feedbackThanks}</FormAlert>;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="locale" value={locale} />
      <p className="flex gap-2 text-sm text-muted">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t.feedbackPrivate}
      </p>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">{t.rating}</legend>
        <div className="grid grid-cols-5 gap-2">
          {t.ratingLabels.map((label, i) => (
            <label key={label} className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border bg-surface p-2 text-center text-xs text-muted has-[:checked]:border-primary has-[:checked]:bg-primary-soft/60 has-[:checked]:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30">
              <input type="radio" name="rating" value={i + 1} required className="sr-only" />
              <span className="text-lg font-semibold text-ink">{i + 1}</span>
              <span className="leading-tight">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{t.comment}</span>
        <textarea name="comment" rows={3} maxLength={2000} className={textareaClass} />
      </label>
      {allowPublic && (
        <label className="flex gap-3 text-sm text-ink">
          <input type="checkbox" name="publicConsent" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
          {t.publicConsent}
        </label>
      )}
      {/* The only user-fixable error is a missing rating. */}
      {state.error && <FormAlert>{t.rating}</FormAlert>}
      <SubmitButton>{t.sendFeedback}</SubmitButton>
    </form>
  );
}
