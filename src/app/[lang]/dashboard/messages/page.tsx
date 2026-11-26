import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { ConversationList } from "@/components/messages/conversation-pages";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.messages.title);

export default function Page({ params }: PageProps<"/[lang]/dashboard/messages">) {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/dashboard/messages">["params"] }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user] = await Promise.all([getDictionary(lang), requireRole(lang, "psychologist", `/${lang}/dashboard/messages`)]);
  return <ConversationList user={user} locale={lang} dict={dict} base={`/${lang}/dashboard/messages`} />;
}
