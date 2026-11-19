"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ links, label }: { links: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1 border-b border-border">
        {links.map((link, i) => {
          const active = i === 0 ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors ${
                  active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
