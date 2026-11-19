import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { SESSION_TYPES } from "@/domain/session-types";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { cities } from "@/data/demo-therapists";
import { ONLINE, type SearchFilters } from "@/lib/search";

const empty: SearchFilters = { concern: "", location: "", type: "" };

/**
 * Plain GET form: works without JavaScript and produces shareable URLs
 * like /el/psychologists?concern=άγχος&type=video.
 */
export function SearchForm({
  locale,
  dict,
  filters = empty,
}: {
  locale: Locale;
  dict: Dictionary;
  filters?: SearchFilters;
}) {
  const field =
    "h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-base text-ink placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const label = "mb-1.5 block text-sm font-medium text-ink";
  const icon =
    "pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted";

  return (
    <form
      action={`/${locale}/psychologists`}
      method="get"
      role="search"
      className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5 lg:grid-cols-[2fr_1.2fr_1.2fr_auto] lg:items-end"
    >
      <div>
        <label htmlFor="concern" className={label}>
          {dict.search.concernLabel}
        </label>
        <div className="relative">
          <Search className={icon} aria-hidden="true" />
          <input
            id="concern"
            name="concern"
            type="search"
            defaultValue={filters.concern}
            placeholder={dict.search.concernPlaceholder}
            className={field}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className={label}>
          {dict.search.locationLabel}
        </label>
        <div className="relative">
          <MapPin className={icon} aria-hidden="true" />
          <select
            id="location"
            name="location"
            defaultValue={filters.location}
            className={`${field} appearance-none`}
          >
            <option value="">{dict.search.anyLocation}</option>
            <option value={ONLINE}>{dict.results.online}</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name[locale]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="type" className={label}>
          {dict.search.sessionTypeLabel}
        </label>
        <div className="relative">
          <SlidersHorizontal className={icon} aria-hidden="true" />
          <select
            id="type"
            name="type"
            defaultValue={filters.type}
            className={`${field} appearance-none`}
          >
            <option value="">{dict.search.anySessionType}</option>
            {SESSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {dict.sessionTypes[type].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="h-12 rounded-xl bg-primary px-6 font-semibold text-primary-ink transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98]"
      >
        {dict.search.submit}
      </button>
    </form>
  );
}
