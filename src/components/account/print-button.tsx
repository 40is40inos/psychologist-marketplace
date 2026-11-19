"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/form";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass.secondary}>
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
