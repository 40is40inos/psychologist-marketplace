"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ value, label, copyLabel, copiedLabel }: { value: string; label: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-3 font-mono text-xs text-ink" />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-ink hover:border-primary"
      >
        {copied ? <Check className="size-4 text-primary" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
      </button>
    </div>
  );
}
