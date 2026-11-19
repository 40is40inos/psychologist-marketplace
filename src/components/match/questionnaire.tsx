"use client";

import { useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { RiskSupport } from "@/components/crisis-notice";

type Q = Dictionary["match"];
const CLIENT_TYPES = ["individuals", "couples", "families", "children", "adolescents"] as const;
const MAX_CONCERNS = 3;
const STEPS = 8;
const noopSubscribe = () => () => {};

const radioCard =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-ink transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30";

function Radio({ name, value, label, def, onPick }: { name: string; value: string; label: string; def: string; onPick?: (v: string) => void }) {
  return (
    <label className={radioCard}>
      <input type="radio" name={name} value={value} defaultChecked={value === def} onChange={onPick ? () => onPick(value) : undefined} className="size-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

function Step({
  i,
  current,
  enhanced,
  progress,
  title,
  hint,
  headingRef,
  children,
}: {
  i: number;
  current: number;
  enhanced: boolean;
  progress: string;
  title: string;
  hint?: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  // Hidden (not unmounted) so answers on other steps stay in the form.
  return (
    <fieldset hidden={enhanced && current !== i} className="space-y-3">
      <legend className="mb-3 w-full">
        {enhanced && <span className="mb-2 block text-sm text-muted">{progress.replace("{current}", String(i + 1)).replace("{total}", String(STEPS))}</span>}
        <h2 ref={current === i ? headingRef : undefined} tabIndex={-1} className="font-display text-2xl font-semibold text-ink focus:outline-none">
          {title}
        </h2>
        {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * One question per screen with JavaScript; all questions on one page
 * without it. Submits a GET form, so answers live in the URL and results
 * can be revisited without storing anything about the person.
 */
export function Questionnaire({
  action,
  t,
  concerns: concernItems,
  genders,
  languages,
  cities,
  initial,
  safety,
}: {
  action: string;
  t: Q;
  concerns: { slug: string; label: string }[];
  genders: Dictionary["taxonomy"]["genders"];
  languages: { slug: string; label: string }[];
  cities: { slug: string; name: string }[];
  initial: Record<string, string | string[] | undefined>;
  safety: Pick<Dictionary, "urgentHelp" | "risk">;
}) {
  // The safety answer is never submitted; it only reveals support immediately.
  const [safetyAnswer, setSafetyAnswer] = useState<"" | "no" | "sometimes" | "often">(initial.support ? "sometimes" : "");
  const atRisk = safetyAnswer === "sometimes" || safetyAnswer === "often";
  // false during server render and hydration, true once JavaScript runs.
  const enhanced = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [step, setStep] = useState(0);
  const v = (k: string, d: string) => String(initial[k] ?? d);
  const [format, setFormat] = useState(v("format", "any"));
  const [concerns, setConcerns] = useState<string[]>(
    Array.isArray(initial.concerns) ? initial.concerns : initial.concerns ? String(initial.concerns).split(",") : [],
  );
  const heading = useRef<HTMLHeadingElement>(null);

  const go = (n: number) => {
    setStep(n);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const common = { current: step, enhanced, progress: t.progress, headingRef: heading };

  return (
    <form action={action} method="get" className="space-y-10">
      {enhanced && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
        </div>
      )}

      <Step i={0} title={t.questions.forWhom} {...common}>
        <div className="grid gap-2 sm:grid-cols-2">
          {CLIENT_TYPES.map((c) => <Radio key={c} name="for" value={c} label={t.options.forWhom[c]} def={v("for", "individuals")} />)}
        </div>
      </Step>

      <Step i={1} title={t.questions.concerns} hint={t.questions.concernsHint} {...common}>
        <div className="flex flex-wrap gap-2">
          {concernItems.map(({ slug: c, label }) => {
            const on = concerns.includes(c);
            const disabled = !on && concerns.length >= MAX_CONCERNS;
            return (
              <label key={c} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30 ${on ? "border-primary bg-primary-soft text-ink" : "border-border bg-surface text-ink"} ${disabled ? "opacity-50" : ""}`}>
                <input
                  type="checkbox"
                  name="concerns"
                  value={c}
                  checked={on}
                  disabled={disabled}
                  onChange={(e) => setConcerns((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
        <fieldset className="mt-6 space-y-2 rounded-2xl border border-border p-4">
          <legend className="px-1 text-sm font-medium text-ink">{t.questions.safety}</legend>
          <p className="text-xs text-muted">{t.questions.safetyHint}</p>
          <div className="flex flex-wrap gap-2">
            {(["no", "sometimes", "often"] as const).map((v) => (
              <label key={v} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-primary-soft/60">
                <input type="radio" checked={safetyAnswer === v} onChange={() => setSafetyAnswer(v)} className="size-4 accent-[var(--primary)]" />
                {t.options.safety[v]}
              </label>
            ))}
          </div>
        </fieldset>
        {atRisk && (
          <>
            <input type="hidden" name="support" value="1" />
            <RiskSupport dict={safety} id="match-risk" />
          </>
        )}
      </Step>

      <Step i={2} title={t.questions.format} {...common}>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["in_person", "online", "any"] as const).map((f) => <Radio key={f} name="format" value={f} label={t.options.format[f]} def={v("format", "any")} onPick={setFormat} />)}
        </div>
        {(format === "in_person" || !enhanced) && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink">{t.questions.city}</span>
            <select name="city" defaultValue={v("city", cities[0]?.slug ?? "")} className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-base text-ink">
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
        )}
      </Step>

      <Step i={3} title={t.questions.language} {...common}>
        <div className="grid gap-2 sm:grid-cols-2">
          {languages.map((l) => <Radio key={l.slug} name="language" value={l.slug} label={l.label} def={v("language", "el")} />)}
        </div>
      </Step>

      <Step i={4} title={t.questions.budget} {...common}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["50", "70", "90", "any"] as const).map((b) => <Radio key={b} name="budget" value={b} label={t.options.budget[b]} def={v("budget", "any")} />)}
        </div>
      </Step>

      <Step i={5} title={t.questions.gender} {...common}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Radio name="gender" value="any" label={t.options.gender.any} def={v("gender", "any")} />
          {(["female", "male", "nonbinary"] as const).map((g) => <Radio key={g} name="gender" value={g} label={genders[g]} def={v("gender", "any")} />)}
        </div>
      </Step>

      <Step i={6} title={t.questions.style} {...common}>
        <div className="grid gap-2">
          {(["practical", "explore", "unsure"] as const).map((s) => <Radio key={s} name="style" value={s} label={t.options.style[s]} def={v("style", "unsure")} />)}
        </div>
      </Step>

      <Step i={7} title={t.questions.timing} {...common}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["soon", "flexible"] as const).map((s) => <Radio key={s} name="timing" value={s} label={t.options.timing[s]} def={v("timing", "flexible")} />)}
        </div>
      </Step>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        {enhanced && step > 0 ? (
          <button type="button" onClick={() => go(step - 1)} className="inline-flex h-12 items-center gap-2 rounded-xl px-3 font-medium text-ink hover:bg-surface-muted">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.back}
          </button>
        ) : (
          <span />
        )}
        {enhanced && step < STEPS - 1 ? (
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => go(step + 1)} className="h-12 rounded-xl px-3 text-sm font-medium text-muted hover:text-ink">
                {t.skip}
              </button>
            )}
            <button type="button" onClick={() => go(step + 1)} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-ink hover:bg-primary-hover">
              {t.next}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-ink hover:bg-primary-hover">
            {t.seeMatches}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
