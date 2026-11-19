import { Illustration, type Scene } from "./illustrations";

/** Placeholder while a signed-in page checks the session and loads data. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-5 w-80 max-w-full animate-pulse rounded bg-surface-muted" />
      <div className="mt-8 h-40 animate-pulse rounded-2xl bg-surface-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface-muted" />
    </div>
  );
}

/** Friendly empty state: a soft illustration, a reassuring line and an optional next step. */
export function EmptyState({ title, body, children, scene }: { title: string; body?: string; children?: React.ReactNode; scene?: Scene }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-border bg-surface px-6 py-10 text-center">
      <Illustration scene={scene} />
      <p className="mt-4 text-lg font-semibold text-ink text-balance">{title}</p>
      {body && <p className="mt-1 max-w-md text-muted text-pretty">{body}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
