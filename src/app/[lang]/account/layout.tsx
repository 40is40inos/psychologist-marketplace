import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { TabNav } from "@/components/ui/tab-nav";

/** Shell only. Every account page checks the client role itself. */
export default async function AccountLayout({ children, params }: LayoutProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const base = `/${lang}/account`;
  const t = dict.account.tabs;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <TabNav
        label={dict.nav.myAccount}
        links={[
          { href: base, label: t.appointments },
          { href: `${base}/messages`, label: t.messages },
          { href: `${base}/saved`, label: t.saved },
          { href: `${base}/receipts`, label: t.receipts },
          { href: `${base}/settings`, label: t.settings },
        ]}
      />
      <div className="mt-8">{children}</div>
    </div>
  );
}
