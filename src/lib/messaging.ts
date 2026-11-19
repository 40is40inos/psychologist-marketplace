import "server-only";
import { displayName } from "@/lib/slug";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * Messaging is between a client and a psychologist they have booked with.
 * Every read and write checks that the current user is one of the two.
 */
export async function conversationsFor(user: CurrentUser, locale: string) {
  const where =
    user.role === "client"
      ? { clientId: user.id }
      : user.role === "psychologist"
        ? { psychologist: { userId: user.id } }
        : null;
  if (!where) return [];
  const rows = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      client: { select: { name: true } },
      psychologist: { select: { slug: true, user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { bodyEncrypted: true, senderId: true, createdAt: true } },
      _count: { select: { messages: { where: { readAt: null, senderId: { not: user.id } } } } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    with: user.role === "client" ? displayName(c.psychologist.user.name, locale) : c.client.name,
    last: c.messages[0] ? { text: safeDecrypt(c.messages[0].bodyEncrypted), mine: c.messages[0].senderId === user.id, at: c.messages[0].createdAt } : null,
    unread: c._count.messages,
  }));
}

export async function getConversation(user: CurrentUser, id: string, locale: string) {
  const c = await db.conversation.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      psychologist: { select: { slug: true, userId: true, user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!c) return null;
  const isClient = c.client.id === user.id;
  const isPsychologist = c.psychologist.userId === user.id;
  if (!isClient && !isPsychologist) return null;

  // Mark the other side's messages as read.
  await db.message.updateMany({ where: { conversationId: id, senderId: { not: user.id }, readAt: null }, data: { readAt: new Date() } });

  return {
    id: c.id,
    with: isClient ? displayName(c.psychologist.user.name, locale) : c.client.name,
    profileSlug: c.psychologist.slug,
    messages: c.messages.map((m) => ({ id: m.id, mine: m.senderId === user.id, text: safeDecrypt(m.bodyEncrypted), at: m.createdAt })),
  };
}

function safeDecrypt(payload: string): string {
  try {
    return decrypt(payload);
  } catch {
    return "…";
  }
}
