import Link from "next/link";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";

/** Placeholder wordmark until the brand identity exists. */
export function Logo({ locale }: { locale: Locale }) {
  return (
    <Link
      href={`/${locale}`}
      className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink"
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-primary text-primary-ink"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 13c2.5 3 11.5 3 14 0" />
          <path d="M8 8.5h.01M16 8.5h.01" />
        </svg>
      </span>
      {brand.name}
    </Link>
  );
}
