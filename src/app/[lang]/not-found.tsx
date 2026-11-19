import Link from "next/link";
import { lang } from "next/root-params";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function NotFound() {
  const value = await lang();
  const locale = isLocale(value) ? value : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl font-semibold text-primary">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">{dict.notFound.title}</h1>
      <p className="mt-2 text-muted">{dict.notFound.body}</p>
      <Link
        href={`/${locale}`}
        className="mt-8 inline-flex h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-ink hover:bg-primary-hover"
      >
        {dict.notFound.back}
      </Link>
    </div>
  );
}
