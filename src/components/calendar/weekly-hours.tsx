"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveWeeklyHours, type CalState } from "@/actions/calendar";
import { FormAlert } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useKeepValuesAction } from "@/components/ui/use-keep-values-action";

type Type = "in_person" | "video" | "phone";
export interface Range {
  weekday: number;
  start: string;
  end: string;
  types: Type[];
}

const TYPES: Type[] = ["in_person", "video", "phone"];
const field = "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-ink tabular-nums focus:border-primary focus:outline-none";

/** Weekly schedule editor: any number of ranges per day, each limited to chosen formats. */
export function WeeklyHours({
  initial,
  t,
  typeLabels,
  savedLabel,
  errorLabels,
}: {
  initial: Range[];
  t: { weekdays: string[]; from: string; to: string; allFormats: string; addRange: string; removeRange: string; closed: string; save: string };
  typeLabels: Record<Type, string>;
  savedLabel: string;
  errorLabels: { invalid: string; range: string };
}) {
  const [ranges, setRanges] = useState<(Range & { key: number })[]>(initial.map((r, i) => ({ ...r, key: i })));
  const [nextKey, setNextKey] = useState(initial.length);
  const { state, onSubmit, isPending } = useKeepValuesAction<CalState>(saveWeeklyHours, {});

  const update = (key: number, patch: Partial<Range>) => setRanges((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (weekday: number) => {
    setRanges((rs) => [...rs, { key: nextKey, weekday, start: "09:00", end: "17:00", types: [] }]);
    setNextKey((k) => k + 1);
  };

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="schedule" value={JSON.stringify(ranges.map((r) => ({ weekday: r.weekday, start: r.start, end: r.end, types: r.types })))} />
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {t.weekdays.map((dayName, i) => {
          const weekday = i + 1;
          const dayRanges = ranges.filter((r) => r.weekday === weekday);
          return (
            <li key={weekday} className="grid gap-3 p-4 sm:grid-cols-[8rem_1fr]">
              <p className="pt-2.5 font-medium text-ink">{dayName}</p>
              <div className="space-y-3">
                {dayRanges.length === 0 && <p className="pt-2.5 text-sm text-muted">{t.closed}</p>}
                {dayRanges.map((r) => (
                  <div key={r.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted/60 p-2">
                    <label className="flex items-center gap-1.5 text-sm text-muted">
                      <span className="sr-only">{t.from}</span>
                      <input type="time" step={900} value={r.start} onChange={(e) => update(r.key, { start: e.target.value })} className={field} aria-label={`${dayName} ${t.from}`} />
                    </label>
                    <span aria-hidden="true" className="text-muted">–</span>
                    <label className="flex items-center gap-1.5 text-sm text-muted">
                      <span className="sr-only">{t.to}</span>
                      <input type="time" step={900} value={r.end} onChange={(e) => update(r.key, { end: e.target.value })} className={field} aria-label={`${dayName} ${t.to}`} />
                    </label>
                    <div className="flex flex-wrap gap-1" role="group" aria-label={`${dayName} ${t.allFormats}`}>
                      {TYPES.map((type) => {
                        const on = r.types.length === 0 || r.types.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              const current = r.types.length === 0 ? TYPES : r.types;
                              const next = on ? current.filter((x) => x !== type) : [...current, type];
                              // All selected (or none) means "all formats".
                              update(r.key, { types: next.length === TYPES.length || next.length === 0 ? [] : next });
                            }}
                            className={`h-9 rounded-lg border px-2.5 text-xs font-medium ${on ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted"}`}
                          >
                            {typeLabels[type]}
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => setRanges((rs) => rs.filter((x) => x.key !== r.key))} aria-label={t.removeRange} className="ml-auto grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-accent">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => add(weekday)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <Plus className="size-4" aria-hidden="true" />
                  {t.addRange}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-4">
        <SubmitButton pending={isPending}>{t.save}</SubmitButton>
        {state.ok && <span key={state.at} role="status" className="text-sm font-medium text-primary">{savedLabel}</span>}
      </div>
      {state.error && <FormAlert>{state.error === "range" ? errorLabels.range : errorLabels.invalid}</FormAlert>}
    </form>
  );
}
