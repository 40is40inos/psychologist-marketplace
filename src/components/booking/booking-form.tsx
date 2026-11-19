"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { bookAction, type BookingState } from "@/actions/booking";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Field, FormAlert, textareaClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function BookingForm({
  hidden,
  t,
  priceLabel,
  backHref,
}: {
  hidden: Record<string, string>;
  t: Dictionary["booking"];
  priceLabel: string;
  backHref: string;
}) {
  const [state, action] = useActionState<BookingState, FormData>(bookAction, {});
  const error = state.error ? t.errors[state.error] : null;

  return (
    <form action={action} className="space-y-8">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {error && (
        <FormAlert>
          {error}{" "}
          {state.error === "slot_taken" && (
            <Link href={backHref} className="font-semibold underline">{t.chooseSlot}</Link>
          )}
        </FormAlert>
      )}

      <section aria-labelledby="intake" className="space-y-4">
        <div>
          <h2 id="intake" className="text-lg font-semibold text-ink">{t.intakeTitle}</h2>
          <p className="text-sm text-muted">{t.intakeIntro}</p>
        </div>
        <Field id="reason" label={t.reason} hint={t.reasonHint}>
          <textarea id="reason" name="reason" rows={3} maxLength={1000} className={textareaClass} aria-describedby="reason-hint" />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">{t.firstTime}</legend>
          <div className="flex flex-wrap gap-2">
            {([["yes", t.yes], ["no", t.no], ["", t.preferNot]] as const).map(([v, label]) => (
              <label key={v || "na"} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50">
                <input type="radio" name="firstTime" value={v} defaultChecked={v === ""} className="size-4 accent-[var(--primary)]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="notes" label={t.notes} hint={t.notesHint}>
          <textarea id="notes" name="notes" rows={2} maxLength={1000} className={textareaClass} aria-describedby="notes-hint" />
        </Field>
      </section>

      <section aria-labelledby="payment" className="space-y-3">
        <h2 id="payment" className="text-lg font-semibold text-ink">{t.payment}</h2>
        <label className="flex gap-3 rounded-2xl border border-primary bg-primary-soft/50 p-4">
          <input type="radio" name="paymentMethod" value="pay_at_session" defaultChecked className="mt-1 size-4 accent-[var(--primary)]" />
          <Wallet className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1">
            <span className="flex justify-between gap-3 font-medium text-ink">
              {t.payAtSession}
              <span className="tabular-nums">{priceLabel}</span>
            </span>
            <span className="block text-sm text-muted">{t.payAtSessionBody}</span>
          </span>
        </label>
      </section>

      <label className="flex gap-3 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        {t.consent}
      </label>

      <SubmitButton className="w-full">{t.confirm}</SubmitButton>
    </form>
  );
}
