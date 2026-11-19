import Link from "next/link";
import { notFound } from "next/navigation";
import { currentMarket } from "@/config/market";
import { intlLocale, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { CurrentUser } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/format";
import { conversationsFor, getConversation } from "@/lib/messaging";
import { EmptyState } from "@/components/ui/page-skeleton";
import { Thread } from "./thread";

/** Shared by the client account and the psychologist dashboard. */
export async function ConversationList({ user, locale, dict, base }: { user: CurrentUser; locale: Locale; dict: Dictionary; base: string }) {
  const list = await conversationsFor(user, locale);
  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink">{dict.messages.title}</h1>
      <div className="mt-6">
        {list.length === 0 ? (
          <EmptyState title={dict.messages.empty} />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`${base}/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-surface-muted">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-ink ${c.unread ? "font-semibold" : "font-medium"}`}>{c.with}</p>
                    <p className="truncate text-sm text-muted">
                      {c.last ? `${c.last.mine ? `${dict.messages.you}: ` : ""}${c.last.text}` : dict.messages.noMessages}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {c.last && <span className="text-xs text-muted">{formatShortDate(c.last.at, locale)}</span>}
                    {c.unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-ink">{c.unread}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export async function ConversationView({ user, id, locale, dict, base }: { user: CurrentUser; id: string; locale: Locale; dict: Dictionary; base: string }) {
  const c = await getConversation(user, id, locale);
  if (!c) notFound();
  return (
    <>
      <Link href={base} className="text-sm font-medium text-primary hover:underline">← {dict.messages.back}</Link>
      <h1 className="mt-3 font-display text-2xl font-semibold text-ink">{c.with}</h1>
      <div className="mt-4">
        <Thread
          conversationId={c.id}
          locale={locale}
          intlLocale={intlLocale[locale]}
          timeZone={currentMarket.timeZone}
          messages={c.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
          t={dict.messages}
        />
      </div>
    </>
  );
}
