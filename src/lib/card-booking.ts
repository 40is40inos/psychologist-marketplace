import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { markPaidAndInvoice } from "@/lib/invoicing";
import { capturePayment, refundCard, voidPayment } from "@/lib/payments";
import { queueNotification, scheduleBookingNotifications } from "@/lib/notifications/schedule";

/**
 * Lifecycle of a card-paid booking:
 *
 *   awaiting_payment ──checkout paid──▶ confirmed (charged)
 *                    └─checkout paid, needs approval──▶ pending (authorised)
 *                         ├─accepted──▶ confirmed (captured)
 *                         └─declined──▶ cancelled (authorisation released)
 *   awaiting_payment ──expired/abandoned──▶ cancelled, slot free again
 *
 * Webhooks can arrive twice or out of order, so every step checks the
 * current state first and does nothing if it has already happened.
 */

const clientPrefs = { id: true, phone: true, emailReminders: true, smsReminders: true } as const;

function intentId(pi: string | Stripe.PaymentIntent | null): string | null {
  return typeof pi === "string" ? pi : pi?.id ?? null;
}

/** checkout.session.completed */
export async function completeCheckout(session: Stripe.Checkout.Session) {
  const appointmentId = session.metadata?.appointmentId;
  const pi = intentId(session.payment_intent);
  const approval = session.metadata?.approval === "1";
  // Cards only, so "unpaid" on a completed session means "authorised, not yet
  // captured", which is exactly the approval case. Otherwise money must be in.
  if (!appointmentId || !pi || (session.payment_status === "unpaid" && !approval)) return "ignored";

  const result = await db.$transaction(async (tx) => {
    const a = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { payment: true, client: { select: clientPrefs }, psychologist: { select: { userId: true } } },
    });
    if (!a?.payment) return "missing" as const;
    if (a.status !== "awaiting_payment") return a.payment.providerRef === pi ? ("duplicate" as const) : ("orphan" as const);

    await tx.payment.update({
      where: { id: a.payment.id },
      data: { provider: "stripe", providerRef: pi, expiresAt: null, ...(approval && { status: "authorized" }) },
    });
    await tx.appointment.update({ where: { id: a.id }, data: { status: approval ? "pending" : "confirmed" } });
    await tx.conversation.upsert({
      where: { clientId_psychologistId: { clientId: a.clientId, psychologistId: a.psychologistId } },
      create: { clientId: a.clientId, psychologistId: a.psychologistId },
      update: {},
    });
    if (approval) {
      await queueNotification(tx, a.clientId, a.id, "booking_pending");
    } else {
      await scheduleBookingNotifications(tx, { appointmentId: a.id, startsAt: a.startsAt, user: a.client }, "booking_confirmation");
    }
    await queueNotification(tx, a.psychologist.userId, a.id, "psychologist_new_booking");
    return { approval, psychologistId: a.psychologistId };
  });

  if (result === "orphan") {
    // Paid after the hold was released (rare race): give the money back.
    await (approval ? voidPayment(pi) : refundCard(pi, session.amount_total ?? 0, `orphan:${pi}`));
    return "refunded";
  }
  if (typeof result === "string") return result;
  if (!result.approval) await markPaidAndInvoice(appointmentId, result.psychologistId, "card");
  return "ok";
}

/** Free a slot held by a checkout that was abandoned or expired. */
export async function releaseHold(appointmentId: string) {
  return db.$transaction(async (tx) => {
    const a = await tx.appointment.findUnique({ where: { id: appointmentId }, select: { status: true } });
    if (a?.status !== "awaiting_payment") return false;
    await tx.appointment.update({ where: { id: appointmentId }, data: { status: "cancelled_by_client", cancelledAt: new Date() } });
    await tx.payment.updateMany({ where: { appointmentId, status: "pending" }, data: { status: "failed", expiresAt: null } });
    await tx.notification.updateMany({ where: { appointmentId, status: "pending" }, data: { status: "skipped" } });
    return true;
  });
}

/** checkout.session.expired */
export async function expireCheckout(session: Stripe.Checkout.Session) {
  const id = session.metadata?.appointmentId;
  return id ? releaseHold(id) : false;
}

/**
 * Move money after a booking changed state. `refundCents` is what the client
 * gets back when a paid booking is cancelled (full, or minus a late fee).
 */
export async function settleCardPayment(appointmentId: string, event: "accepted" | "cancelled", refundCents?: number) {
  const a = await db.appointment.findUnique({ where: { id: appointmentId }, include: { payment: true } });
  const pay = a?.payment;
  if (!a || !pay || pay.method !== "card" || pay.provider !== "stripe" || !pay.providerRef) return;

  if (pay.status === "authorized") {
    if (event === "accepted") {
      try {
        await capturePayment(pay.providerRef);
        await markPaidAndInvoice(a.id, a.psychologistId, "card");
      } catch (e) {
        // Authorisations lapse after about 7 days: fall back to paying at the session.
        console.error("[payments] capture failed", e);
        await db.payment.update({ where: { id: pay.id }, data: { status: "pending", method: "pay_at_session" } });
        await db.appointment.update({ where: { id: a.id }, data: { paymentMethod: "pay_at_session" } });
      }
    } else {
      await voidPayment(pay.providerRef).catch((e) => console.error("[payments] void failed", e));
      await db.payment.update({ where: { id: pay.id }, data: { status: "waived" } });
    }
    return;
  }

  if (pay.status === "paid" && event === "cancelled") {
    const cents = Math.min(refundCents ?? pay.amountCents, pay.amountCents - pay.refundedCents);
    if (cents <= 0) return;
    await refundCard(pay.providerRef, cents, `cancel:${a.id}`);
    const total = pay.refundedCents + cents;
    await db.payment.update({
      where: { id: pay.id },
      data: {
        refundedCents: total,
        refundedAt: new Date(),
        refundReason: "cancellation",
        ...(total === pay.amountCents && { status: "refunded", commissionCents: 0 }),
      },
    });
  }
}
