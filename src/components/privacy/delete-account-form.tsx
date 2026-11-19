"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteState } from "@/actions/privacy";
import type { Dictionary } from "@/i18n/get-dictionary";
import { FormAlert, inputClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function DeleteAccountForm({ locale, t }: { locale: string; t: Dictionary["privacyCenter"] }) {
  const [state, action] = useActionState<DeleteState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{t.deleteConfirm}</span>
        <input name="confirm" autoComplete="off" className={`${inputClass} max-w-60`} placeholder={t.deleteWord} />
      </label>
      {state.error && <FormAlert key={state.at}>{state.error === "upcoming" ? t.deleteBlocked : t.deleteError}</FormAlert>}
      <SubmitButton variant="danger">{t.deleteButton}</SubmitButton>
    </form>
  );
}
