"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClass } from "./form";

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
  name,
  value,
  pending: pendingProp,
}: {
  children: React.ReactNode;
  variant?: keyof typeof buttonClass;
  className?: string;
  name?: string;
  value?: string;
  /** Pass when the form isn't submitted via the action prop. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`${buttonClass[variant]} ${className}`}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
