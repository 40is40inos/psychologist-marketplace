"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rescheduleAction } from "@/actions/booking";
import { SubmitButton } from "@/components/ui/submit-button";

export interface SlotOption {
  /** "video", "in_person", "phone", or "intro:video" / "intro:phone". */
  key: string;
  label: string;
  sub: string;
  /** ISO UTC start times. */
  slots: string[];
}

const DAYS_PER_PAGE = 7;

/**
 * Format tabs -> day strip -> time grid. Times are shown in the market's
 * time zone regardless of the visitor's device settings.
 */
export function SlotPicker({
  options,
  intlLocale,
  timeZone,
  labels,
  mode,
  initialKey,
}: {
  options: SlotOption[];
  intlLocale: string;
  timeZone: string;
  labels: { chooseType: string; chooseSlot: string; noSlots: string; more: string; earlier: string; tz: string; confirm?: string };
  mode: { kind: "link"; base: string } | { kind: "reschedule"; appointmentId: string; locale: string };
  initialKey?: string;
}) {
  const [key, setKey] = useState(initialKey && options.some((o) => o.key === initialKey) ? initialKey : options[0]?.key);
  const option = options.find((o) => o.key === key);
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const dayKey = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }),
    [timeZone],
  );
  const dayLabel = useMemo(() => new Intl.DateTimeFormat(intlLocale, { timeZone, weekday: "short", day: "numeric", month: "short" }), [intlLocale, timeZone]);
  const timeLabel = useMemo(() => new Intl.DateTimeFormat(intlLocale, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), [intlLocale, timeZone]);

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of option?.slots ?? []) {
      const k = dayKey.format(new Date(s));
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [option, dayKey]);

  const [day, setDay] = useState<string | null>(null);
  const activeDay = days.find(([k]) => k === day) ?? days[0];
  const visible = days.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE);

  const href = (slot: string) => {
    if (mode.kind !== "link" || !option) return "#";
    const [kind, type] = option.key.startsWith("intro:") ? ["intro_call", option.key.slice(6)] : ["session", option.key];
    return `${mode.base}?${new URLSearchParams({ type, kind, start: slot })}`;
  };

  return (
    <div className="space-y-5">
      {options.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">{labels.chooseType}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30">
                <input
                  type="radio"
                  name="slot-format"
                  className="sr-only"
                  checked={key === o.key}
                  onChange={() => {
                    setKey(o.key);
                    setDay(null);
                    setPage(0);
                    setPicked(null);
                  }}
                />
                <span className="font-medium text-ink">{o.label}</span>
                <span className="text-sm tabular-nums text-muted">{o.sub}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{labels.chooseSlot}</h3>
          <div className="flex gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label={labels.earlier} className="grid size-9 place-items-center rounded-lg border border-border text-ink disabled:opacity-40">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * DAYS_PER_PAGE >= days.length} aria-label={labels.more} className="grid size-9 place-items-center rounded-lg border border-border text-ink disabled:opacity-40">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {days.length === 0 ? (
          <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">{labels.noSlots}</p>
        ) : (
          <>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="listbox" aria-label={labels.chooseSlot}>
              {visible.map(([k, slots]) => {
                const selected = activeDay?.[0] === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setDay(k);
                      setPicked(null);
                    }}
                    className={`flex min-w-[4.75rem] flex-col items-center rounded-xl border px-2 py-2 text-sm transition-colors ${
                      selected ? "border-primary bg-primary text-primary-ink" : "border-border bg-surface text-ink hover:border-primary"
                    }`}
                  >
                    <span className="font-medium">{dayLabel.format(new Date(slots[0]))}</span>
                    <span className={`text-xs ${selected ? "opacity-90" : "text-muted"}`}>{slots.length}</span>
                  </button>
                );
              })}
            </div>

            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {activeDay?.[1].map((s) => (
                <li key={s}>
                  {mode.kind === "link" ? (
                    <Link href={href(s)} className="flex h-11 items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold tabular-nums text-ink transition-colors hover:border-primary hover:bg-primary-soft">
                      {timeLabel.format(new Date(s))}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPicked(s)}
                      aria-pressed={picked === s}
                      className={`flex h-11 w-full items-center justify-center rounded-lg border text-sm font-semibold tabular-nums ${picked === s ? "border-primary bg-primary text-primary-ink" : "border-border bg-surface text-ink hover:border-primary"}`}
                    >
                      {timeLabel.format(new Date(s))}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{labels.tz}</p>
          </>
        )}
      </div>

      {mode.kind === "reschedule" && picked && (
        <form action={rescheduleAction}>
          <input type="hidden" name="appointmentId" value={mode.appointmentId} />
          <input type="hidden" name="start" value={picked} />
          <input type="hidden" name="locale" value={mode.locale} />
          <SubmitButton className="w-full">{labels.confirm}</SubmitButton>
        </form>
      )}
    </div>
  );
}
