import Link from "next/link";
import { SESSION_TYPES } from "@/domain/session-types";
import { APPROACHES, CLIENT_TYPES, CONCERNS, GENDERS, SESSION_LANGUAGES } from "@/domain/taxonomy";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { SearchFilters } from "@/lib/search";
import { AVAILABILITY_WINDOWS } from "@/lib/search-constants";
import { inputClass } from "@/components/ui/form";

/**
 * All filters in one GET form. Checkbox groups use native inputs, so the
 * panel works with or without JavaScript. On phones it lives inside a
 * <details> drawer; on desktop it's a sidebar.
 */
export function FilterPanel({
  locale,
  dict,
  filters: f,
  view,
}: {
  locale: Locale;
  dict: Dictionary;
  filters: SearchFilters;
  view: "list" | "map";
}) {
  const t = dict.filters;
  const tax = dict.taxonomy;

  return (
    <form action={`/${locale}/psychologists`} method="get" className="space-y-6">
      {/* Keep the top search bar's values. */}
      {f.q && <input type="hidden" name="q" value={f.q} />}
      {f.location && <input type="hidden" name="location" value={f.location} />}
      {f.date && <input type="hidden" name="date" value={f.date} />}
      {f.sort !== "relevance" && <input type="hidden" name="sort" value={f.sort} />}
      {view === "map" && <input type="hidden" name="view" value="map" />}

      <Group title={t.format}>
        <Radio name="format" value="" checked={!f.format} label={t.anyFormat} />
        {SESSION_TYPES.map((s) => (
          <Radio key={s} name="format" value={s} checked={f.format === s} label={dict.sessionTypes[s].label} />
        ))}
      </Group>

      <Group title={t.concerns} collapsible={CONCERNS.length > 6} moreLabel={fillCount(t.showMore, CONCERNS.length)}>
        {CONCERNS.map((c, i) => (
          <Check key={c} name="concerns" value={c} checked={f.concerns.includes(c)} label={tax.concerns[c]} extra={i >= 6 && !f.concerns.includes(c)} />
        ))}
      </Group>

      <Group title={t.approaches}>
        {APPROACHES.map((a) => (
          <Check key={a} name="approaches" value={a} checked={f.approaches.includes(a)} label={tax.approaches[a]} />
        ))}
      </Group>

      <Group title={t.clientTypes}>
        {CLIENT_TYPES.map((c) => (
          <Check key={c} name="for" value={c} checked={f.clientTypes.includes(c)} label={tax.clientTypes[c]} />
        ))}
      </Group>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">{t.price}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">{t.priceMin}</span>
            <input name="min" inputMode="numeric" pattern="\d*" defaultValue={f.priceMin ?? ""} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">{t.priceMax}</span>
            <input name="max" inputMode="numeric" pattern="\d*" defaultValue={f.priceMax ?? ""} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <Group title={t.language}>
        <Radio name="language" value="" checked={!f.language} label={t.anyLanguage} />
        {SESSION_LANGUAGES.map((l) => (
          <Radio key={l} name="language" value={l} checked={f.language === l} label={dict.languages[l]} />
        ))}
      </Group>

      <Group title={t.gender}>
        <Radio name="gender" value="" checked={!f.gender} label={t.anyGender} />
        {GENDERS.map((g) => (
          <Radio key={g} name="gender" value={g} checked={f.gender === g} label={tax.genders[g]} />
        ))}
      </Group>

      <Group title={t.availability}>
        <Radio name="available" value="" checked={!f.availability} label={t.anyTime} />
        {AVAILABILITY_WINDOWS.map((w) => (
          <Radio key={w} name="available" value={w} checked={f.availability === w} label={t.availabilityOptions[w]} />
        ))}
      </Group>

      <div className="sticky bottom-0 -mx-1 flex gap-2 bg-surface px-1 py-3">
        <button type="submit" className="h-12 flex-1 rounded-xl bg-primary px-4 font-semibold text-primary-ink hover:bg-primary-hover">
          {t.apply}
        </button>
        <Link href={`/${locale}/psychologists`} className="inline-flex h-12 items-center rounded-xl border border-border px-4 text-sm font-medium text-ink hover:border-primary">
          {t.clear}
        </Link>
      </div>
    </form>
  );
}

function fillCount(template: string, count: number) {
  return template.replace("{count}", String(count));
}

function Group({ title, children, collapsible, moreLabel }: { title: string; children: React.ReactNode; collapsible?: boolean; moreLabel?: string }) {
  return (
    <fieldset className="group/fs">
      <legend className="mb-2 text-sm font-semibold text-ink">{title}</legend>
      <div className="space-y-0.5">{children}</div>
      {collapsible && (
        // CSS-only "show more": the checkbox reveals the extra options.
        <label className="mt-1 inline-flex cursor-pointer items-center text-sm font-medium text-primary hover:underline">
          <input type="checkbox" className="peer sr-only" />
          <span className="peer-checked:hidden">{moreLabel}</span>
        </label>
      )}
    </fieldset>
  );
}

const optionClass = "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-ink hover:bg-surface-muted";

function Check({ name, value, checked, label, extra }: { name: string; value: string; checked: boolean; label: string; extra?: boolean }) {
  return (
    <label className={`${optionClass} ${extra ? "hidden group-has-[label>input.peer:checked]/fs:flex" : ""}`}>
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="size-4 shrink-0 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

function Radio({ name, value, checked, label }: { name: string; value: string; checked: boolean; label: string }) {
  return (
    <label className={optionClass}>
      <input type="radio" name={name} value={value} defaultChecked={checked} className="size-4 shrink-0 accent-[var(--primary)]" />
      {label}
    </label>
  );
}
