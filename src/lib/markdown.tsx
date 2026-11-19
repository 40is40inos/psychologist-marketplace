import type { ReactNode } from "react";

/**
 * Small, safe Markdown renderer for CMS content. Produces React elements
 * (never raw HTML), so admin-written text can't inject scripts.
 * Supports: # ## ### headings, paragraphs, - / * lists, 1. lists, > quotes,
 * **bold**, *italic*, `code`, [links](https://…).
 */
function safeHref(url: string): string | null {
  if (/^(https?:\/\/|mailto:|\/)/i.test(url) && !/^\/\//.test(url)) return url;
  return null;
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[2]) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={key}>{m[3]}</em>);
    else if (m[4]) out.push(<code key={key} className="rounded bg-surface-muted px-1 py-0.5 text-[0.9em]">{m[4]}</code>);
    else if (m[5]) {
      const href = safeHref(m[6]);
      out.push(
        href ? (
          <a key={key} href={href} className="font-medium text-primary underline underline-offset-2" {...(href.startsWith("http") && { rel: "noopener noreferrer", target: "_blank" })}>
            {m[5]}
          </a>
        ) : (
          m[5]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[17px] leading-relaxed text-ink">
      {blocks.map((block, b) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        const key = `b${b}`;
        const h = lines[0].match(/^(#{1,3})\s+(.*)$/);
        if (h && lines.length === 1) {
          const level = h[1].length;
          const cls = level === 1 ? "font-display text-3xl font-semibold" : level === 2 ? "mt-8 font-display text-2xl font-semibold" : "mt-6 text-xl font-semibold";
          // The page title is the h1, so # and ## both become h2 and ### h3: no skipped levels.
          const Tag = (level <= 2 ? "h2" : "h3") as "h2";
          return <Tag key={key} className={cls}>{inline(h[2], key)}</Tag>;
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={key} className="list-disc space-y-1 pl-6">
              {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ""), `${key}-${i}`)}</li>)}
            </ul>
          );
        }
        if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
          return (
            <ol key={key} className="list-decimal space-y-1 pl-6">
              {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+\.\s+/, ""), `${key}-${i}`)}</li>)}
            </ol>
          );
        }
        if (lines.every((l) => l.startsWith(">"))) {
          return (
            <blockquote key={key} className="border-l-4 border-primary/40 pl-4 italic text-muted">
              {inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), key)}
            </blockquote>
          );
        }
        return <p key={key}>{inline(lines.join(" "), key)}</p>;
      })}
    </div>
  );
}
