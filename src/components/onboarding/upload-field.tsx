"use client";

import { useState } from "react";
import { prepareUpload } from "@/actions/uploads";
import type { UploadKind } from "@/domain/uploads";

const fileClass =
  "block w-full text-sm text-ink file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-primary-soft file:px-4 file:font-medium file:text-primary";

type Status = "idle" | "uploading" | "done" | "failed" | "type" | "size" | "rate_limited";

/**
 * A file input. In development the file is sent with the form. With bucket
 * storage (`direct`), the file goes straight from the browser to the bucket
 * as soon as it is chosen, and the form only sends a signed ticket — this
 * keeps form requests small (serverless hosts cap them at a few MB).
 */
export function UploadField({
  id,
  kind,
  direct,
  accept,
  describedBy,
  t,
}: {
  id: string;
  kind: UploadKind;
  direct: boolean;
  accept: string;
  describedBy?: string;
  t: { uploading: string; done: string; failed: string; wait: string; type: string; size: string; rate_limited: string };
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [ticket, setTicket] = useState("");

  if (!direct) return <input id={id} name={id} type="file" accept={accept} className={fileClass} aria-describedby={describedBy} />;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const file = el.files?.[0];
    setTicket("");
    el.setCustomValidity("");
    if (!file) return setStatus("idle");
    setStatus("uploading");
    // Blocks submitting the step until the upload has finished.
    el.setCustomValidity(t.wait);
    try {
      const prepared = await prepareUpload({ kind, mime: file.type, size: file.size, filename: file.name });
      if ("error" in prepared) {
        setStatus(prepared.error === "empty" ? "failed" : prepared.error);
        el.setCustomValidity(t[prepared.error === "empty" ? "failed" : prepared.error]);
        return;
      }
      const res = await fetch(prepared.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!res.ok) throw new Error(String(res.status));
      setTicket(prepared.ticket);
      setStatus("done");
      el.setCustomValidity("");
    } catch {
      setStatus("failed");
      el.setCustomValidity(t.failed);
    }
  }

  const message = status === "idle" ? null : t[status];
  return (
    <>
      <input id={id} type="file" accept={accept} onChange={onChange} className={fileClass} aria-describedby={[describedBy, `${id}-status`].filter(Boolean).join(" ")} />
      <input type="hidden" name={`${id}Ticket`} value={ticket} />
      <p id={`${id}-status`} role="status" className={`mt-1 text-sm ${status === "done" ? "text-primary" : status === "uploading" ? "text-muted" : "text-accent"}`}>
        {message}
      </p>
    </>
  );
}
