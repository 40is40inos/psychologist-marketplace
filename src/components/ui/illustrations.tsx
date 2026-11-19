/**
 * Soft empty-state illustrations. Hand-drawn-feeling line art on a pale sage
 * blob, drawn only with design tokens so they follow light and dark mode.
 * Purely decorative: the text next to them carries the meaning.
 */
export type Scene = "leaf" | "search" | "calendar" | "messages" | "saved" | "receipts" | "people" | "notes";

const stroke = { fill: "none", stroke: "var(--primary)", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const soft = { fill: "var(--surface)", stroke: "var(--primary)", strokeWidth: 2.5, strokeLinejoin: "round" } as const;

function Blob() {
  return (
    <>
      <path d="M30 62c-4-22 12-42 36-44 20-2 38 6 46 24 9 20 2 44-18 54-22 11-50 6-60-12-2-4-3-14-4-22Z" fill="var(--primary-soft)" />
      <circle cx="112" cy="26" r="4" fill="var(--primary-soft)" />
      <circle cx="22" cy="100" r="3" fill="var(--primary-soft)" />
    </>
  );
}

/** A small sprig, the recurring calm motif. */
function Sprig({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} {...stroke}>
      <path d="M0 0c2-10 2-18-2-26" />
      <path d="M0-10c6-2 10-6 11-12-6 0-10 4-11 12Z" fill="var(--primary-soft)" />
      <path d="M-1-18c-6-2-9-6-9-11 5 0 9 4 9 11Z" fill="var(--primary-soft)" />
    </g>
  );
}

const scenes: Record<Scene, React.ReactNode> = {
  leaf: (
    <>
      <path d="M48 96h44l-5 18H53l-5-18Z" {...soft} />
      <path d="M70 96c0-16 0-30-6-44" {...stroke} />
      <path d="M68 70c10-2 18-10 20-22-12 0-19 8-20 22Z" {...stroke} fill="var(--primary-soft)" />
      <path d="M66 62c-10-2-16-10-16-20 10 0 16 8 16 20Z" {...stroke} fill="var(--primary-soft)" />
    </>
  ),
  search: (
    <>
      <circle cx="62" cy="58" r="22" {...soft} />
      <path d="M78 74l18 18" {...stroke} strokeWidth={5} />
      <path d="M52 52c3-5 8-8 14-8" {...stroke} />
      <Sprig x={104} y={108} s={0.9} />
    </>
  ),
  calendar: (
    <>
      <rect x="38" y="36" width="64" height="58" rx="10" {...soft} />
      <path d="M38 52h64M54 30v12M86 30v12" {...stroke} />
      <circle cx="58" cy="68" r="3" fill="var(--primary)" />
      <circle cx="74" cy="68" r="3" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth={2} />
      <path d="M82 78l6 6 10-12" {...stroke} />
      <Sprig x={30} y={112} s={0.8} />
    </>
  ),
  messages: (
    <>
      <path d="M32 42h52a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H52l-12 10v-10h-8a8 8 0 0 1-8-8V50a8 8 0 0 1 8-8Z" {...soft} />
      <path d="M58 70h46a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8h-4v9l-11-9H58a8 8 0 0 1-8-8V78a8 8 0 0 1 8-8Z" {...soft} fill="var(--primary-soft)" />
      <path d="M40 56h28M40 64h18" {...stroke} />
    </>
  ),
  saved: (
    <>
      <path d="M70 100S36 80 36 56c0-11 8-19 18-19 7 0 12 4 16 10 4-6 9-10 16-10 10 0 18 8 18 19 0 24-34 44-34 44Z" {...soft} />
      <path d="M50 56c0-5 3-8 7-9" {...stroke} />
      <Sprig x={108} y={112} s={0.8} />
    </>
  ),
  receipts: (
    <>
      <path d="M46 30h48v76l-8-6-8 6-8-6-8 6-8-6-8 6V30Z" {...soft} />
      <path d="M56 46h28M56 58h28M56 70h16" {...stroke} />
      <circle cx="98" cy="88" r="12" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth={2.5} />
      <path d="M93 88l4 4 7-8" {...stroke} />
    </>
  ),
  people: (
    <>
      <circle cx="56" cy="50" r="12" {...soft} />
      <path d="M34 98c0-14 10-24 22-24s22 10 22 24" {...soft} />
      <circle cx="88" cy="56" r="10" {...soft} fill="var(--primary-soft)" />
      <path d="M72 98c1-12 8-20 16-20 9 0 16 8 17 20" {...stroke} />
    </>
  ),
  notes: (
    <>
      <rect x="42" y="32" width="52" height="68" rx="8" {...soft} />
      <path d="M54 50h28M54 62h28M54 74h18" {...stroke} />
      <path d="M96 64l14-14 6 6-14 14-8 2 2-8Z" {...stroke} fill="var(--primary-soft)" />
    </>
  ),
};

export function Illustration({ scene = "leaf", className = "size-28" }: { scene?: Scene; className?: string }) {
  return (
    <svg viewBox="0 0 140 130" className={className} aria-hidden="true" focusable="false">
      <Blob />
      {scenes[scene]}
    </svg>
  );
}
