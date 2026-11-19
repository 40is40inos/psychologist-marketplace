import { LifeBuoy } from "lucide-react";
import { currentMarket } from "@/config/market";
import type { Dictionary } from "@/i18n/get-dictionary";

/**
 * Shown on every page. A booking platform is not crisis care, so people
 * need a direct route to emergency and helpline numbers.
 */
export function CrisisNotice({ dict }: { dict: Dictionary }) {
  const { emergency, suicide, mentalHealth } = currentMarket.crisisLines;
  const numbers = { emergency, suicide, mentalHealth };

  // Split the sentence around {placeholders} so each number becomes a tel: link.
  const parts = dict.crisis.body.split(/(\{\w+\})/g);

  return (
    <aside className="rounded-2xl border border-accent/30 bg-accent-soft p-5 sm:p-6" aria-labelledby="crisis-title">
      <div className="flex gap-4">
        <LifeBuoy className="mt-0.5 size-6 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h2 id="crisis-title" className="font-semibold text-ink">{dict.crisis.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
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
        </div>
      </div>
    </aside>
  );
}
