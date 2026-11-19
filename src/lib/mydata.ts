import "server-only";

/**
 * AADE myDATA e-invoicing (Greece). A psychologist issues a receipt for
 * services ("Απόδειξη Παροχής Υπηρεσιών", invoice type 11.2) under their own
 * tax number and myDATA credentials; the platform only prepares and sends it.
 *
 * The VAT and classification codes below are the common case for
 * psychological services to private individuals, but they depend on the
 * psychologist's tax situation. Confirm them with an accountant and override
 * per environment if needed.
 */
export const MYDATA_DEFAULTS = {
  invoiceType: "11.2",
  /** 7 = 0% VAT (no VAT). */
  vatCategory: process.env.MYDATA_VAT_CATEGORY ?? "7",
  /** VAT exemption reason; health services (art. 22 VAT code). */
  vatExemptionCategory: process.env.MYDATA_VAT_EXEMPTION ?? "7",
  /** Retail sales of services to private customers. */
  classificationType: process.env.MYDATA_CLASSIFICATION_TYPE ?? "E3_561_003",
  /** Income from provision of services. */
  classificationCategory: process.env.MYDATA_CLASSIFICATION_CATEGORY ?? "category1_3",
  /** Payment method: 3 = cash, 7 = POS / e-POS. */
  paymentMethod: { cash: "3", card: "7" },
};

const ENDPOINT =
  process.env.MYDATA_ENV === "production"
    ? "https://mydatapi.aade.gr/myDATA/SendInvoices"
    : "https://mydataapidev.aade.gr/SendInvoices";

export interface ReceiptInput {
  issuerAfm: string;
  series: string;
  number: number;
  issueDate: Date;
  netCents: number;
  vatCents: number;
  paymentMethod: "cash" | "card";
}

const money = (cents: number) => (cents / 100).toFixed(2);
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export function buildReceiptXml(r: ReceiptInput): string {
  const d = MYDATA_DEFAULTS;
  const gross = r.netCents + r.vatCents;
  const classification = `<icls:classificationType>${d.classificationType}</icls:classificationType><icls:classificationCategory>${d.classificationCategory}</icls:classificationCategory><icls:amount>${money(r.netCents)}</icls:amount>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<InvoicesDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0" xmlns:icls="https://www.aade.gr/myDATA/incomeClassificaton/v1.0">
  <invoice>
    <issuer><vatNumber>${esc(r.issuerAfm)}</vatNumber><country>GR</country><branch>0</branch></issuer>
    <invoiceHeader>
      <series>${esc(r.series)}</series>
      <aa>${r.number}</aa>
      <issueDate>${r.issueDate.toISOString().slice(0, 10)}</issueDate>
      <invoiceType>${d.invoiceType}</invoiceType>
      <currency>EUR</currency>
    </invoiceHeader>
    <paymentMethods><paymentMethodDetails><type>${d.paymentMethod[r.paymentMethod]}</type><amount>${money(gross)}</amount></paymentMethodDetails></paymentMethods>
    <invoiceDetails>
      <lineNumber>1</lineNumber>
      <netValue>${money(r.netCents)}</netValue>
      <vatCategory>${d.vatCategory}</vatCategory>
      <vatAmount>${money(r.vatCents)}</vatAmount>
      ${r.vatCents === 0 ? `<vatExemptionCategory>${d.vatExemptionCategory}</vatExemptionCategory>` : ""}
      <incomeClassification>${classification}</incomeClassification>
    </invoiceDetails>
    <invoiceSummary>
      <totalNetValue>${money(r.netCents)}</totalNetValue>
      <totalVatAmount>${money(r.vatCents)}</totalVatAmount>
      <totalWithheldAmount>0.00</totalWithheldAmount>
      <totalFeesAmount>0.00</totalFeesAmount>
      <totalStampDutyAmount>0.00</totalStampDutyAmount>
      <totalOtherTaxesAmount>0.00</totalOtherTaxesAmount>
      <totalDeductionsAmount>0.00</totalDeductionsAmount>
      <totalGrossValue>${money(gross)}</totalGrossValue>
      <incomeClassification>${classification}</incomeClassification>
    </invoiceSummary>
  </invoice>
</InvoicesDoc>`;
}

export type SendResult =
  | { ok: true; mark: string; uid: string | null; qrUrl: string | null }
  | { ok: false; error: string };

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? null;

/** Send one receipt with the psychologist's own myDATA credentials. */
export async function sendReceipt(xml: string, creds: { userId: string; subscriptionKey: string }): Promise<SendResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "aade-user-id": creds.userId, "ocp-apim-subscription-key": creds.subscriptionKey, "Content-Type": "application/xml" },
      body: xml,
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
    if (tag(body, "statusCode") !== "Success") {
      return { ok: false, error: (tag(body, "message") ?? body).slice(0, 300) };
    }
    const mark = tag(body, "invoiceMark");
    if (!mark) return { ok: false, error: "No MARK in response" };
    return { ok: true, mark, uid: tag(body, "invoiceUid"), qrUrl: tag(body, "qrUrl") };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) };
  }
}
