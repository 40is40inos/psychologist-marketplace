"use client";

import { savePrices, type SaveState } from "@/actions/psychologist";
import { SESSION_TYPES, type SessionType } from "@/domain/session-types";
import type { Dictionary } from "@/i18n/get-dictionary";
import { FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useKeepValuesAction } from "@/components/ui/use-keep-values-action";
import { SessionTypeIcon } from "@/components/session-type-icon";

export type PricesFormData = Partial<
  Record<SessionType, { active: boolean; durationMinutes: number; priceCents: number }>
>;

/** Cents -> "60" or "60.50" for the input. */
function toInput(cents: number | undefined): string {
  if (cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function PricesForm({
  data,
  t,
  sessionTypes,
}: {
  data: PricesFormData;
  t: Dictionary["dashboard"];
  sessionTypes: Dictionary["sessionTypes"];
}) {
  const { state, onSubmit, isPending } = useKeepValuesAction<SaveState>(savePrices, {});

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {SESSION_TYPES.map((type) => {
          const row = data[type];
          return (
            <li key={type} className="grid gap-3 p-4 sm:grid-cols-[1fr_8rem_8rem] sm:items-end">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" name={`active_${type}`} defaultChecked={row?.active ?? false} className="size-5 accent-[var(--primary)]" />
                <SessionTypeIcon type={type} className="size-5 text-primary" />
                <span className="font-medium text-ink">{sessionTypes[type].label}</span>
                <span className="sr-only">{t.offer}</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">{t.duration}</span>
                <input name={`duration_${type}`} inputMode="numeric" defaultValue={row?.durationMinutes ?? 50} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">{t.price}</span>
                <input name={`price_${type}`} inputMode="decimal" placeholder="60" defaultValue={toInput(row?.priceCents)} className={inputClass} />
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={isPending}>{t.save}</SubmitButton>
        {state.ok && <span key={state.at} role="status" className="text-sm font-medium text-primary">{t.saved}</span>}
      </div>
      {state.error && <FormAlert>{t.saveError}</FormAlert>}
    </form>
  );
}
