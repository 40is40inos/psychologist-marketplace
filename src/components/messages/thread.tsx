"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { sendMessage, type SimpleState } from "@/actions/account";
import { SubmitButton } from "@/components/ui/submit-button";

interface Msg {
  id: string;
  mine: boolean;
  text: string;
  at: string;
}

/**
 * Conversation view. Polls for new messages every 15 seconds while the tab
 * is visible; good enough for asynchronous therapy messaging without a
 * realtime service.
 */
export function Thread({
  conversationId,
  locale,
  intlLocale,
  timeZone,
  messages,
  t,
}: {
  conversationId: string;
  locale: string;
  intlLocale: string;
  timeZone: string;
  messages: Msg[];
  t: { placeholder: string; send: string; security: string; you: string; noMessages: string };
}) {
  const [state, action] = useActionState<SimpleState, FormData>(sendMessage, {});
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);
  const fmt = new Intl.DateTimeFormat(intlLocale, { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface">
      <p className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        {t.security}
      </p>
      <ol className="max-h-[60vh] min-h-48 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && <li className="text-center text-sm text-muted">{t.noMessages}</li>}
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.mine ? "rounded-br-md bg-primary text-primary-ink" : "rounded-bl-md bg-surface-muted text-ink"}`}>
              <p className="whitespace-pre-wrap break-words text-[15px]">{m.text}</p>
              <p className={`mt-1 text-[11px] ${m.mine ? "opacity-80" : "text-muted"}`}>
                {m.mine && `${t.you} · `}
                {fmt.format(new Date(m.at))}
              </p>
            </div>
          </li>
        ))}
        <div ref={end} />
      </ol>
      <form
        action={action}
        key={state.at}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="locale" value={locale} />
        <label className="sr-only" htmlFor="body">{t.placeholder}</label>
        <textarea
          id="body"
          name="body"
          rows={2}
          required
          maxLength={4000}
          placeholder={t.placeholder}
          className="min-h-12 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
        <SubmitButton className="h-12 shrink-0">
          <Send className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t.send}</span>
        </SubmitButton>
      </form>
    </div>
  );
}
