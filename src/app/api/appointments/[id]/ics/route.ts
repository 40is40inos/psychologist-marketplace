import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/get-dictionary";
import { brand } from "@/config/brand";
import { appointmentIcs } from "@/lib/appointment-ics";

/** Calendar file for one appointment. Only the client or the psychologist can download it. */
export async function GET(_req: Request, ctx: RouteContext<"/api/appointments/[id]/ics">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const a = await db.appointment.findUnique({
    where: { id },
    include: {
      client: { select: { name: true } },
      psychologist: {
        select: {
          userId: true,
          user: { select: { name: true } },
          offices: { take: 1, select: { addressLine: true, postalCode: true } },
        },
      },
    },
  });
  if (!a || (a.clientId !== user.id && a.psychologist.userId !== user.id)) return new Response("Not found", { status: 404 });

  const dict = await getDictionary(user.locale);
  const office = a.psychologist.offices[0];
  const isClient = a.clientId === user.id;
  const ics = appointmentIcs(
    a,
    {
      name: isClient ? a.psychologist.user.name : a.client.name,
      format: a.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[a.sessionType].label,
      where: a.sessionType === "in_person" && office ? `${office.addressLine}, ${office.postalCode}` : dict.notifications.online,
      url: `${brand.siteUrl}/${user.locale}/${isClient ? "account" : "dashboard"}`,
    },
    a.status.startsWith("cancelled"),
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-${a.startsAt.toISOString().slice(0, 10)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
