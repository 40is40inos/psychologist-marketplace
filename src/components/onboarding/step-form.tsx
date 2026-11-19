"use client";

import Link from "next/link";
import type { StepState } from "@/actions/onboarding";
import { FormAlert } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useKeepValuesAction } from "@/components/ui/use-keep-values-action";

/**
 * Wraps one wizard step. Fields are rendered on the server and passed as
 * children; the action saves and redirects to the next step, or returns an
 * error code shown above the buttons. Submitting via onSubmit keeps what the
 * person typed when validation fails (a plain form action would reset it).
 */
export function StepForm({
  action,
  locale,
  errors,
  submitLabel,
  backHref,
  backLabel,
  children,
}: {
  action: (state: StepState, fd: FormData) => Promise<StepState>;
  locale: string;
  errors: Record<NonNullable<StepState["error"]>, string>;
  submitLabel: string;
  backHref?: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  const { state, onSubmit, isPending } = useKeepValuesAction<StepState>(action, {});
  return (
    <form method="post" encType="multipart/form-data" onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {children}
      {state.error && <FormAlert key={state.at}>{errors[state.error]}</FormAlert>}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        {backHref ? (
          <Link href={backHref} className="inline-flex h-11 items-center rounded-xl px-3 font-medium text-ink hover:bg-surface-muted">← {backLabel}</Link>
        ) : (
          <span />
        )}
        <SubmitButton pending={isPending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
