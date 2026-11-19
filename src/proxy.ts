import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { negotiateLocale } from "@/i18n/negotiate";
import { PROTECTED_AREAS } from "@/domain/roles";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Every page lives under /{locale}. Requests without a locale prefix are
 * redirected using, in order: the visitor's saved choice (cookie), their
 * browser languages, then the default locale (Greek).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Static files (favicon.ico, robots.txt, images) are served as-is.
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();

  const first = pathname.split("/")[1];

  if (isLocale(first)) {
    // Optimistic check only: no cookie means definitely signed out. Pages
    // still verify the session and role against the database.
    const rest = pathname.slice(first.length + 1) || "/";
    const isProtected = PROTECTED_AREAS.some(
      ({ prefix }) => rest === prefix || rest.startsWith(`${prefix}/`),
    );
    if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${first}/sign-in`;
      url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }

    // Remember an explicit choice so "/" sends the visitor back to it.
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== first) {
      response.cookies.set(LOCALE_COOKIE, first, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : negotiateLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals and API routes.
  matcher: ["/((?!_next|api).*)"],
};

