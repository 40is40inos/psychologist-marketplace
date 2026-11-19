import { CalendarDays, Languages, MapPin, Search } from "lucide-react";
import type { TaxonomyItem } from "@/lib/taxonomy-data";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

export interface SearchFormValues {
  q: string;
  location: string;
  language: string;
  date: string;
}

const empty: SearchFormValues = { q: "", location: "", language: "", date: "" };

/**
 * Concern, location (or online), language and date. Plain GET form: works
 * without JavaScript and gives shareable URLs. Other filters are kept as
 * hidden fields so a new search doesn't drop them.
 */
export function SearchForm({
  locale,
  dict,
  cities,
  languages,
  values = empty,
  keep,
}: {
  locale: Locale;
  dict: Dictionary;
  cities: { slug: string; name: string }[];
  languages: TaxonomyItem[];
  values?: SearchFormValues;
  keep?: URLSearchParams;
}) {
  const field =
    "h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-base text-ink placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const label = "mb-1.5 block text-sm font-medium text-ink";
  const icon = "pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted";
  const kept = keep ? [...keep.entries()].filter(([k]) => !["q", "location", "language", "date"].includes(k)) : [];

  return (
    <form
      action={`/${locale}/psychologists`}
      method="get"
      role="search"
      className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-[2fr_1.2fr_1.1fr_1.1fr_auto] lg:items-end"
    >
      {kept.map(([k, v], i) => (
        <input key={`${k}-${i}`} type="hidden" name={k} value={v} />
      ))}
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="q" className={label}>{dict.search.concernLabel}</label>
        <div className="relative">
          <Search className={icon} aria-hidden="true" />
          <input id="q" name="q" type="search" defaultValue={values.q} placeholder={dict.search.concernPlaceholder} className={field} autoComplete="off" enterKeyHint="search" maxLength={80} />
        </div>
      </div>

      <div>
        <label htmlFor="location" className={label}>{dict.search.locationLabel}</label>
        <div className="relative">
          <MapPin className={icon} aria-hidden="true" />
          <select id="location" name="location" defaultValue={values.location} className={`${field} appearance-none`}>
            <option value="">{dict.search.anyLocation}</option>
            <option value="online">{dict.results.online}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="language" className={label}>{dict.search.languageLabel}</label>
        <div className="relative">
          <Languages className={icon} aria-hidden="true" />
          <select id="language" name="language" defaultValue={values.language} className={`${field} appearance-none`}>
            <option value="">{dict.filters.anyLanguage}</option>
            {languages.map((l) => (
              <option key={l.slug} value={l.slug}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="date" className={label}>{dict.search.dateLabel}</label>
        <div className="relative">
          <CalendarDays className={icon} aria-hidden="true" />
          <input id="date" name="date" type="date" defaultValue={values.date} className={field} />
        </div>
      </div>

      <button
        type="submit"
        className="h-12 rounded-xl bg-primary px-6 font-semibold text-primary-ink transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98] sm:col-span-2 lg:col-span-1"
      >
        {dict.search.submit}
      </button>
    </form>
  );
}
