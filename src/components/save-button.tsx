import { Heart } from "lucide-react";
import { toggleSaved } from "@/actions/client";
import type { Locale } from "@/i18n/config";

/** Plain form so it works before JavaScript loads. */
export function SaveButton({
  slug,
  saved,
  locale,
  returnTo,
  labels,
  compact = false,
}: {
  slug: string;
  saved: boolean;
  locale: Locale;
  returnTo: string;
  labels: { save: string; saved: string };
  compact?: boolean;
}) {
  return (
    <form action={toggleSaved}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        aria-pressed={saved}
        aria-label={compact ? (saved ? labels.saved : labels.save) : undefined}
        className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
          saved ? "border-accent/40 bg-accent-soft text-accent" : "border-border bg-surface text-ink hover:border-primary"
        }`}
      >
        <Heart className={`size-4 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
        {!compact && (saved ? labels.saved : labels.save)}
      </button>
    </form>
  );
}
