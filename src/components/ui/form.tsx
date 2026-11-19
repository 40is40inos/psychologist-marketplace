import type { ReactNode } from "react";

export const inputClass =
  "h-12 w-full rounded-xl border bg-surface px-3 text-base text-ink placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-accent border-border focus:border-primary disabled:opacity-60";

export const textareaClass =
  "min-h-28 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-accent";

export const buttonClass = {
  primary:
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-ink transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
  secondary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold text-ink transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-60",
  danger:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent-soft px-4 font-semibold text-accent transition-colors hover:border-accent disabled:pointer-events-none disabled:opacity-60",
} as const;

/** Label + control + hint + error, wired up with ids for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-accent">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export function describedBy(id: string, { error, hint }: { error?: string; hint?: string }) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${
        tone === "error" ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
      }`}
    >
      {children}
    </p>
  );
}
