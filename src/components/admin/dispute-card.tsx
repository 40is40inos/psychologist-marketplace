"use client";

import { useActionState } from "react";
import { decideDispute, type AdminActionState } from "@/actions/admin";
import type { Dictionary } from "@/i18n/get-dictionary";
import { FormAlert, textareaClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export interface DisputeItem {
  id: string;
  status: keyof Dictionary["admin"]["disputes"]["statuses"];
  openedBy: string;
  session: string;
  reason: string;
  resolution: string | null;
  created: string;
}

export function DisputeCard({ item, t }: { item: DisputeItem; t: Dictionary["admin"]["disputes"] }) {
  const [state, action] = useActionState<AdminActionState, FormData>(decideDispute, {});
  const closed = item.status === "resolved" || item.status === "rejected";
  const resolutionId = `resolution-${item.id}`;

  return (
    <li className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{item.session}</p>
          <p className="text-sm text-muted">{item.openedBy} · {item.created}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${closed ? "bg-surface-muted text-muted" : "bg-accent-soft text-accent"}`}>
          {t.statuses[item.status]}
        </span>
      </div>
      <div className="mt-4 rounded-xl bg-surface-muted p-4 text-sm">
        <p className="text-muted">{t.reason}</p>
        <p className="mt-1 whitespace-pre-line text-ink">{item.reason}</p>
      </div>

      {closed ? (
        item.resolution && (
          <div className="mt-3 text-sm">
            <p className="text-muted">{t.resolution}</p>
            <p className="mt-1 whitespace-pre-line text-ink">{item.resolution}</p>
          </div>
        )
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="disputeId" value={item.id} />
          <div>
            <label htmlFor={resolutionId} className="mb-1.5 block text-sm font-medium text-ink">{t.resolution}</label>
            <textarea id={resolutionId} name="resolution" rows={2} maxLength={2000} placeholder={t.resolutionPlaceholder} className={`${textareaClass} min-h-0`} />
          </div>
          {state.error === "reason_required" && <FormAlert>{t.resolutionRequired}</FormAlert>}
          <div className="flex flex-wrap gap-2">
            {item.status === "open" && <SubmitButton name="decision" value="review" variant="secondary">{t.startReview}</SubmitButton>}
            <SubmitButton name="decision" value="resolve">{t.resolve}</SubmitButton>
            <SubmitButton name="decision" value="reject" variant="danger">{t.rejectDispute}</SubmitButton>
          </div>
        </form>
      )}
    </li>
  );
}
