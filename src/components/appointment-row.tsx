import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { SessionType } from "@/domain/session-types";
import { fill, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { SessionTypeIcon } from "./session-type-icon";

export interface AppointmentRowData {
  id: string;
  startsAt: Date;
  sessionType: SessionType;
  status: keyof Dictionary["appointmentStatus"];
  priceCents: number;
  /** The other party: the psychologist for clients, the client for psychologists. */
  counterpart: string;
}

const statusTone: Record<AppointmentRowData["status"], string> = {
  pending: "bg-surface-muted text-muted",
  confirmed: "bg-primary-soft text-primary",
  completed: "bg-surface-muted text-muted",
  cancelled_by_client: "bg-accent-soft text-accent",
  cancelled_by_psychologist: "bg-accent-soft text-accent",
  no_show: "bg-accent-soft text-accent",
};

export function AppointmentRow({ a, locale, dict, withPrefix }: { a: AppointmentRowData; locale: Locale; dict: Dictionary; withPrefix?: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      <div className="w-24 shrink-0">
        <p className="font-semibold text-ink">{formatShortDate(a.startsAt, locale)}</p>
        <p className="text-sm tabular-nums text-muted">{formatTime(a.startsAt, locale)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          {withPrefix ? fill(dict.account.with, { name: a.counterpart }) : a.counterpart}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <SessionTypeIcon type={a.sessionType} className="size-4" />
          {dict.sessionTypes[a.sessionType].label} · {formatPrice(a.priceCents, locale)}
        </p>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[a.status]}`}>
        {dict.appointmentStatus[a.status]}
      </span>
    </li>
  );
}
