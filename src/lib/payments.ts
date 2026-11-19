import "server-only";
import Stripe from "stripe";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";

/**
 * Card payments through Stripe Checkout. Card details are entered on
 * Stripe's hosted page and never reach our servers (PCI SAQ A). Stripe runs
 * Strong Customer Authentication (3-D Secure) whenever the issuer requires
 * it, which in the EU is almost always.
 *
 * Card payments are offered only when STRIPE_SECRET_KEY is set; otherwise
 * clients pay at the session.
 */

/** How long an unpaid checkout holds the slot (Stripe's minimum is 30 min). */
export const CHECKOUT_HOLD_MINUTES = 30;

let client: Stripe | null = null;

export function cardPaymentsEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: brand.name } });
  return client;
}

/**
 * Start a hosted checkout. With `manualCapture` the card is only authorised
 * and charged when the psychologist accepts the request.
 */
export async function createCheckout(input: {
  appointmentId: string;
  amountCents: number;
  description: string;
  email: string;
  locale: Locale;
  manualCapture: boolean;
  expiresAt: Date;
}): Promise<{ id: string; url: string }> {
  const base = brand.siteUrl.replace(/\/$/, "");
  const back = `${base}/${input.locale}/account/appointments/${input.appointmentId}`;
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      // Cards only: they support 3-D Secure and delayed capture.
      allowed_payment_method_types: ["card"],
      customer_email: input.email,
      locale: input.locale,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: input.amountCents,
            // Neutral wording: the receipt and statement don't mention therapy.
            product_data: { name: input.description },
          },
        },
      ],
      payment_intent_data: {
        capture_method: input.manualCapture ? "manual" : "automatic",
        statement_descriptor_suffix: brand.statementDescriptor.slice(0, 22),
        metadata: { appointmentId: input.appointmentId },
      },
      metadata: { appointmentId: input.appointmentId, approval: input.manualCapture ? "1" : "0" },
      client_reference_id: input.appointmentId,
      expires_at: Math.floor(input.expiresAt.getTime() / 1000),
      success_url: `${back}?paid=1`,
      cancel_url: `${back}?payment=cancelled`,
    },
    // Retrying the same booking never creates two checkouts.
    { idempotencyKey: `checkout:${input.appointmentId}:${input.expiresAt.getTime()}` },
  );
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return { id: session.id, url: session.url };
}

/** Reopen an open checkout session (e.g. the client closed the tab). */
export async function checkoutUrl(sessionId: string): Promise<string | null> {
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  return s.status === "open" ? s.url : null;
}

export async function capturePayment(paymentIntentId: string) {
  return stripe().paymentIntents.capture(paymentIntentId);
}

/** Release an authorisation that was never captured. */
export async function voidPayment(paymentIntentId: string) {
  return stripe().paymentIntents.cancel(paymentIntentId);
}

export async function refundCard(paymentIntentId: string, amountCents: number, key: string) {
  return stripe().refunds.create({ payment_intent: paymentIntentId, amount: amountCents }, { idempotencyKey: key });
}

/** Verify the Stripe-Signature header. Throws on a bad signature. */
export function verifyWebhook(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return Stripe.webhooks.constructEvent(payload, signature, secret);
}
