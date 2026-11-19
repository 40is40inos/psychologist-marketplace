import Link from "next/link";
import { LifeBuoy, Phone } from "lucide-react";
import { currentMarket } from "@/config/market";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { fill } from "@/lib/format";

const LINE_ORDER = ["emergency", "suicide", "mentalHealth"] as const;

/** Large tap-to-call buttons for the market's crisis lines. */
export function CrisisLines({ dict, size = "md" }: { dict: Pick<Dictionary, "urgentHelp">; size?: "md" | "lg" }) {
  const lines = currentMarket.crisisLines;
  return (
    <ul className="grid gap-2 sm:grid-cols-3">
      {LINE_ORDER.map((key) => (
        <li key={key}>
          <a
            href={`tel:${lines[key]}`}
            className={`flex h-full items-center gap-3 rounded-xl border border-accent/30 bg-surface px-4 text-ink transition-colors hover:border-accent ${size === "lg" ? "min-h-20 py-3" : "min-h-14 py-2"}`}
          >
            <Phone className="size-5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <span className={`block font-semibold tabular-nums ${size === "lg" ? "text-2xl" : "text-lg"}`}>{lines[key]}</span>
              <span className="block text-sm text-muted">{dict.urgentHelp.lines[key]}</span>
              <span className="sr-only">{fill(dict.urgentHelp.call, { number: lines[key] })}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Crisis notice. The platform is not crisis care, so every page (footer),
 * the booking flow and any risk signal lead straight to emergency numbers.
 */
export function CrisisNotice({
  dict,
  locale,
  id = "crisis-title",
  compact = false,
}: {
  dict: Dictionary;
  locale?: Locale;
  id?: string;
  compact?: boolean;
}) {
  const { emergency, suicide, mentalHealth } = currentMarket.crisisLines;
  const numbers = { emergency, suicide, mentalHealth };
  // Split the sentence around {placeholders} so each number becomes a tel: link.
  const parts = dict.crisis.body.split(/(\{\w+\})/g);

  return (
    <aside className={`rounded-2xl border border-accent/30 bg-accent-soft ${compact ? "p-4" : "p-5 sm:p-6"}`} aria-labelledby={id}>
      <div className="flex gap-3 sm:gap-4">
        <LifeBuoy className="mt-0.5 size-6 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h2 id={id} className="font-semibold text-ink">{dict.crisis.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {parts.map((part, i) => {
              const key = part.slice(1, -1) as keyof typeof numbers;
              if (part.startsWith("{") && key in numbers) {
                return (
                  <a key={i} href={`tel:${numbers[key]}`} className="font-semibold text-ink underline underline-offset-2">
                    {numbers[key]}
                  </a>
                );
              }
              return part;
            })}
          </p>
          {locale && (
            <Link href={`/${locale}/urgent-help`} className="mt-2 inline-block text-sm font-semibold text-ink underline underline-offset-2">
              {dict.urgentHelp.link}
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

/** Shown immediately when an answer suggests risk of self-harm. */
export function RiskSupport({ dict, id = "risk-title" }: { dict: Pick<Dictionary, "urgentHelp" | "risk">; id?: string }) {
  return (
    <section role="alert" aria-labelledby={id} className="space-y-3 rounded-2xl border-2 border-accent bg-accent-soft p-5">
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-ink">
        <LifeBuoy className="size-5 text-accent" aria-hidden="true" />
        {dict.risk.title}
      </h2>
      <p className="text-ink">{dict.risk.body}</p>
      <CrisisLines dict={dict} />
      <p className="text-sm text-muted">{dict.risk.continue}</p>
    </section>
  );
}
