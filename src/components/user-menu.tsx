import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/actions/auth";
import { homePathFor } from "@/domain/roles";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";

/** Reads the session cookie, so render it inside <Suspense>. */
export async function UserMenu({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href={`/${locale}/sign-in`}
        className="inline-flex h-10 items-center whitespace-nowrap rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-soft sm:px-3"
      >
        {dict.nav.signIn}
      </Link>
    );
  }

  const homeLabel = { client: dict.nav.myAccount, psychologist: dict.nav.dashboard, admin: dict.nav.admin }[user.role];
  const first = user.name.split(" ")[0];

  return (
    <details className="group relative">
      <summary
        aria-label={dict.nav.userMenu}
        className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink hover:bg-surface-muted"
      >
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary">
          <UserRound className="size-4" />
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{first}</span>
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-border bg-surface p-2 shadow-lg">
        <p className="truncate px-3 pb-2 pt-1 text-xs text-muted">
          {user.email} · {dict.roles[user.role]}
        </p>
        <Link href={`/${locale}${homePathFor(user.role)}`} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted">
          {homeLabel}
        </Link>
        <Link href={`/${locale}/security`} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted">
          {dict.twoFactor.security}
        </Link>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-surface-muted">
            <LogOut className="size-4 text-muted" aria-hidden="true" />
            {dict.nav.signOut}
          </button>
        </form>
      </div>
    </details>
  );
}
