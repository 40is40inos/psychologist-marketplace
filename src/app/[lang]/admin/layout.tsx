import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { TabNav } from "@/components/ui/tab-nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: { default: dict.admin.title, template: `%s | ${dict.admin.title}` }, robots: { index: false } };
}

/** Shell only. Every admin page checks the admin role itself. */
export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const base = `/${lang}/admin`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-sm font-semibold text-primary">{dict.admin.title}</p>
      <div className="mt-3">
        <TabNav
          label={dict.admin.title}
          links={[
            { href: base, label: dict.admin.nav.overview },
            { href: `${base}/verifications`, label: dict.admin.nav.verifications },
            { href: `${base}/users`, label: dict.admin.nav.users },
            { href: `${base}/bookings`, label: dict.adminX.nav.bookings },
            { href: `${base}/disputes`, label: dict.admin.nav.disputes },
            { href: `${base}/reviews`, label: dict.adminX.nav.reviews },
            { href: `${base}/taxonomy`, label: dict.adminX.nav.taxonomy },
            { href: `${base}/content`, label: dict.adminX.nav.content },
            { href: `${base}/analytics`, label: dict.adminX.nav.analytics },
            { href: `${base}/audit`, label: dict.adminX.nav.audit },
            { href: `${base}/plans`, label: dict.adminPlans.title },
          ]}
        />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
