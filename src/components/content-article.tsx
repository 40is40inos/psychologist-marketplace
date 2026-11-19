import Link from "next/link";
import type { ContentView } from "@/lib/content";
import { Markdown } from "@/lib/markdown";

/** Shared layout for blog articles and static pages. */
export function ContentArticle({ page, meta, back }: { page: ContentView; meta?: string; back?: { href: string; label: string } }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14" lang={page.locale}>
      {back && <Link href={back.href} className="text-sm font-medium text-primary hover:underline">← {back.label}</Link>}
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">{page.title}</h1>
      {meta && <p className="mt-2 text-sm text-muted">{meta}</p>}
      {page.excerpt && <p className="mt-4 text-lg text-muted">{page.excerpt}</p>}
      {page.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.coverUrl} alt="" className="mt-6 aspect-[2/1] w-full rounded-2xl object-cover" />
      )}
      <div className="mt-8">
        <Markdown source={page.body} />
      </div>
    </article>
  );
}
