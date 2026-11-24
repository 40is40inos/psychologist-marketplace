"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Suspense } from "react";

type Props = { links: { href: string; label: string }[]; label: string };

/** Streams in because it reads the URL; the fallback is the same tabs with none highlighted. */
export function TabNav(props: Props) {
  return (
    <Suspense fallback={<Tabs {...props} pathname="" />}>
      <ActiveTabs {...props} />
    </Suspense>
  );
}

function ActiveTabs(props: Props) {
  return <Tabs {...props} pathname={usePathname()} />;
}

function Tabs({ links, label, pathname }: Props & { pathname: string }) {
  return (
    <nav aria-label={label} className="print:hidden relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1 border-b border-border">
        {links.map((link, i) => {
          const active = i === 0 ? pathname === link.href || (!links.slice(1).some((l) => pathname.startsWith(l.href)) && pathname.startsWith(link.href)) : pathname.startsWith(link.href);
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
