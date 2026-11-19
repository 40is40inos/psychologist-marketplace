/**
 * Real photo when available (softly rounded square, more human than a tiny
 * circle), otherwise warm initials. Decorative: the name is always shown next to it.
 */
export function Avatar({ name, photoUrl, size = "md" }: { name: string; photoUrl: string | null; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-28 rounded-3xl text-3xl sm:size-32" : "size-16 rounded-2xl text-xl";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" loading="lazy" className={`${cls} shrink-0 bg-surface-muted object-cover`} />;
  }
  return (
    <div aria-hidden="true" className={`${cls} grid shrink-0 place-items-center bg-primary-soft font-semibold text-primary`}>
      {initials}
    </div>
  );
}
