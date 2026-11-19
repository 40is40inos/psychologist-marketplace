"use client";

import { useEffect, useRef } from "react";
import { FormAlert } from "./form";
import { SubmitButton } from "./submit-button";
import { useKeepValuesAction } from "./use-keep-values-action";

interface State {
  ok?: boolean;
  error?: string;
  detail?: string;
  at?: number;
}

/**
 * Small server-action form with "Saved" feedback and mapped error messages.
 * Fields are passed as children (they can be server-rendered). What the
 * person typed is kept when saving fails; `resetOnSuccess` clears the form
 * after a successful save (e.g. for "add" forms).
 */
export function ActionForm<S extends State>({
  action,
  children,
  submitLabel,
  savedLabel,
  errors = {},
  className = "space-y-4",
  variant = "primary",
  resetOnSuccess = false,
}: {
  action: (state: Awaited<S>, fd: FormData) => Promise<S>;
  children: React.ReactNode;
  submitLabel: string;
  savedLabel?: string;
  errors?: Record<string, string>;
  className?: string;
  variant?: "primary" | "secondary";
  resetOnSuccess?: boolean;
}) {
  const { state, onSubmit, isPending } = useKeepValuesAction<S>(action, {} as S);
  const form = useRef<HTMLFormElement>(null);
  const s = state as State;

  useEffect(() => {
    if (resetOnSuccess && s.ok) form.current?.reset();
  }, [resetOnSuccess, s.ok, s.at]);

  const message = s.error ? (errors[s.error] ?? errors.invalid ?? s.error).replace("{error}", s.detail ?? "") : null;
  return (
    <form ref={form} method="post" onSubmit={onSubmit} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton variant={variant} pending={isPending}>{submitLabel}</SubmitButton>
        {s.ok && savedLabel && <span key={s.at} role="status" className="text-sm font-medium text-primary">{savedLabel}</span>}
      </div>
      {message && <FormAlert key={s.at}>{message}</FormAlert>}
    </form>
  );
}
