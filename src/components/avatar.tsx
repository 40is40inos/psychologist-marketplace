/** Photo when available, otherwise initials. Decorative: the name is always shown next to it. */
export function Avatar({ name, photoUrl, size = "md" }: { name: string; photoUrl: string | null; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-24 text-3xl" : "size-14 text-lg";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" className={`${cls} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div aria-hidden="true" className={`${cls} grid shrink-0 place-items-center rounded-full bg-primary-soft font-display font-semibold text-primary`}>
      {initials}
    </div>
  );
}
