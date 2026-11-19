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

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 text-sm text-muted">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
