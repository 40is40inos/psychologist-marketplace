import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { SessionType } from "@/domain/session-types";
import { fill, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { SessionTypeIcon } from "./session-type-icon";

export interface AppointmentRowData {
  id: string;
  startsAt: Date;
  sessionType: SessionType;
  kind?: "session" | "intro_call";
  status: keyof Dictionary["appointmentStatus"];
  priceCents: number;
  /** The other party: the psychologist for clients, the client for psychologists. */
  counterpart: string;
  lateCancellation?: boolean;
}

const statusTone: Record<AppointmentRowData["status"], string> = {
  awaiting_payment: "bg-surface-muted text-muted",
  pending: "bg-surface-muted text-muted",
  confirmed: "bg-primary-soft text-primary",
  completed: "bg-surface-muted text-muted",
  cancelled_by_client: "bg-accent-soft text-accent",
  cancelled_by_psychologist: "bg-accent-soft text-accent",
  no_show: "bg-accent-soft text-accent",
};

export function AppointmentRow({
  a,
  locale,
  dict,
  withPrefix,
  href,
  extra,
}: {
  a: AppointmentRowData;
  locale: Locale;
  dict: Dictionary;
  withPrefix?: boolean;
  href?: string;
  extra?: React.ReactNode;
}) {
  const format = a.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[a.sessionType].label;
  const body = (
    <>
      <div className="w-24 shrink-0">
        <p className="font-semibold text-ink">{formatShortDate(a.startsAt, locale)}</p>
        <p className="text-sm tabular-nums text-muted">{formatTime(a.startsAt, locale)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{withPrefix ? fill(dict.account.with, { name: a.counterpart }) : a.counterpart}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <SessionTypeIcon type={a.sessionType} className="size-4" />
          {format} · {a.priceCents === 0 ? dict.booking.free : formatPrice(a.priceCents, locale)}
        </p>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[a.status]}`}>
        {a.lateCancellation ? dict.account.lateCancellation : dict.appointmentStatus[a.status]}
      </span>
      {href && <ChevronRight className="size-4 text-muted" aria-hidden="true" />}
    </>
  );
  return (
    <li className="py-1">
      {href ? (
        <Link href={href} className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-2 py-3 hover:bg-surface-muted">
          {body}
        </Link>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">{body}</div>
      )}
      {extra}
    </li>
  );
}
