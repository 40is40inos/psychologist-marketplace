import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { ConversationView } from "@/components/messages/conversation-pages";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.messages.title);

export default function Page({ params }: PageProps<"/[lang]/account/messages/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/account/messages/[id]">["params"] }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user] = await Promise.all([getDictionary(lang), requireRole(lang, "client", `/${lang}/account/messages/${id}`)]);
  return <ConversationView user={user} id={id} locale={lang} dict={dict} base={`/${lang}/account/messages`} />;
}
