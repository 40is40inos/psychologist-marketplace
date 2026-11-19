import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { TabNav } from "@/components/ui/tab-nav";

/** Psychologist workspace shell. Every page checks the psychologist role itself. */
export default async function DashboardLayout({ children, params }: LayoutProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const base = `/${lang}/dashboard`;
  const n = dict.workspace.nav;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <TabNav
        label={dict.nav.dashboard}
        links={[
          { href: base, label: n.overview },
          { href: `${base}/appointments`, label: n.appointments },
          { href: `${base}/calendar`, label: n.calendar },
          { href: `${base}/clients`, label: n.clients },
          { href: `${base}/messages`, label: n.messages },
          { href: `${base}/payments`, label: n.payments },
          { href: `${base}/analytics`, label: n.analytics },
          { href: `${base}/feedback`, label: n.feedback },
          { href: `${base}/profile`, label: n.profile },
          { href: `${base}/plan`, label: n.plan },
        ]}
      />
      <div className="mt-8">{children}</div>
    </div>
  );
}
