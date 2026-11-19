"use client";

import { useRouter } from "next/navigation";
import { SORTS } from "@/lib/search-constants";

/** Changes the sort by updating the URL; falls back to a normal link list without JS. */
export function SortSelect({
  current,
  params,
  label,
  labels,
  basePath,
}: {
  current: string;
  params: string;
  label: string;
  labels: Record<(typeof SORTS)[number], string>;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="whitespace-nowrap text-muted">{label}</span>
      <select
        value={current}
        onChange={(e) => {
          const p = new URLSearchParams(params);
          if (e.target.value === "relevance") p.delete("sort");
          else p.set("sort", e.target.value);
          router.push(`${basePath}?${p.toString()}`);
        }}
        className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-ink focus:border-primary focus:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>{labels[s]}</option>
        ))}
      </select>
    </label>
  );
}
