"use client";

import { useActionState } from "react";
import { decideVerification, type AdminActionState } from "@/actions/admin";
import type { Dictionary } from "@/i18n/get-dictionary";
import { FormAlert, textareaClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export interface VerificationItem {
  profileId: string;
  name: string;
  email: string;
  title: string;
  licenseNumber: string;
  licensingAuthority: string;
  submitted: string;
  documents: { id: string; label: string }[];
}

export function VerificationCard({ item, t, docs }: { item: VerificationItem; t: Dictionary["admin"]["verifications"]; docs: Dictionary["adminDocs"] }) {
  const [state, action] = useActionState<AdminActionState, FormData>(decideVerification, {});
  const reasonId = `reason-${item.profileId}`;

  return (
    <li className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{item.name}</p>
          <p className="text-sm text-muted">{item.title} · {item.email}</p>
        </div>
        <p className="text-sm text-muted">{item.submitted}</p>
      </div>
      <dl className="mt-4 grid gap-3 rounded-xl bg-surface-muted p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">{t.license}</dt>
          <dd className="font-mono font-medium text-ink">{item.licenseNumber}</dd>
        </div>
        <div>
          <dt className="text-muted">{t.authority}</dt>
          <dd className="font-medium text-ink">{item.licensingAuthority}</dd>
        </div>
      </dl>

      <div className="mt-3 text-sm">
        <p className="font-medium text-ink">{docs.documents}</p>
        {item.documents.length === 0 ? (
          <p className="text-muted">{docs.noDocuments}</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {item.documents.map((d) => (
              <li key={d.id}>
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="text-primary underline">{d.label}</a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="profileId" value={item.profileId} />
        <div>
          <label htmlFor={reasonId} className="mb-1.5 block text-sm font-medium text-ink">{t.rejectReason}</label>
          <textarea id={reasonId} name="reason" rows={2} maxLength={500} placeholder={t.rejectReasonPlaceholder} className={`${textareaClass} min-h-0`} />
        </div>
        {state.error === "reason_required" && <FormAlert>{t.reasonRequired}</FormAlert>}
        <div className="flex flex-wrap gap-2">
          <SubmitButton name="decision" value="approve">{t.approve}</SubmitButton>
          <SubmitButton name="decision" value="reject" variant="danger">{t.reject}</SubmitButton>
        </div>
      </form>
    </li>
  );
}
