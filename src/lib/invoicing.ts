import "server-only";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { buildReceiptXml, MYDATA_DEFAULTS, sendReceipt } from "@/lib/mydata";
import { commissionFor, planFor } from "@/lib/plans";

/**
 * Mark a session as paid and issue the receipt. Called when the psychologist
 * records payment at the session (later also by the card-payment webhook).
 * The receipt is numbered per psychologist; myDATA transmission is attempted
 * when the psychologist has saved credentials, otherwise it stays "issued"
 * so it can be sent later.
 */
export async function markPaidAndInvoice(appointmentId: string, psychologistId: string, method: "cash" | "card") {
  const plan = await planFor(psychologistId);
  const invoiceId = await db.$transaction(async (tx) => {
    const a = await tx.appointment.findFirst({
      where: { id: appointmentId, psychologistId },
      include: { payment: true, invoice: true, client: { select: { name: true } } },
    });
    if (!a || !a.payment || a.payment.status === "paid" || a.priceCents === 0) return a?.invoice?.id ?? null;

    // Platform-wide receipt number for the client's records.
    const count = await tx.payment.count({ where: { receiptNumber: { not: null } } });
    await tx.payment.update({
      where: { id: a.payment.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        method: method === "card" ? "card" : "pay_at_session",
        receiptNumber: `R-${new Date().getUTCFullYear()}-${String(count + 1).padStart(6, "0")}`,
        commissionCents: commissionFor(a.priceCents, plan?.commissionBps ?? 0),
      },
    });
    if (a.invoice) return a.invoice.id;

    // Lock numbering per psychologist so two receipts never share a number.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"invoice:" + psychologistId}))`;
    const last = await tx.invoice.findFirst({ where: { psychologistId, series: "A" }, orderBy: { number: "desc" }, select: { number: true } });
    const invoice = await tx.invoice.create({
      data: {
        psychologistId,
        appointmentId: a.id,
        number: (last?.number ?? 0) + 1,
        clientName: a.client.name,
        netCents: a.priceCents,
        totalCents: a.priceCents,
        vatExemption: MYDATA_DEFAULTS.vatExemptionCategory,
        status: "issued",
      },
    });
    return invoice.id;
  });

  if (invoiceId) await transmitInvoice(invoiceId, method).catch(() => {});
  return invoiceId;
}

/** Send an issued receipt to myDATA if the psychologist has credentials. */
export async function transmitInvoice(invoiceId: string, method: "cash" | "card" = "cash") {
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { psychologist: { select: { taxIdEncrypted: true, mydataUserEncrypted: true, mydataKeyEncrypted: true } } },
  });
  if (!inv || inv.status === "transmitted") return inv;
  const p = inv.psychologist;
  if (!p.taxIdEncrypted || !p.mydataUserEncrypted || !p.mydataKeyEncrypted) return inv; // stays "issued"

  const xml = buildReceiptXml({
    issuerAfm: decrypt(p.taxIdEncrypted),
    series: inv.series,
    number: inv.number,
    issueDate: inv.issueDate,
    netCents: inv.netCents,
    vatCents: inv.vatCents,
    paymentMethod: method,
  });
  const result = await sendReceipt(xml, { userId: decrypt(p.mydataUserEncrypted), subscriptionKey: decrypt(p.mydataKeyEncrypted) });
  return db.invoice.update({
    where: { id: inv.id },
    data: result.ok
      ? { status: "transmitted", mydataMark: result.mark, mydataUid: result.uid, mydataQrUrl: result.qrUrl, mydataError: null }
      : { status: "failed", mydataError: result.error },
  });
}
