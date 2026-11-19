import type Stripe from "stripe";
import { completeCheckout, expireCheckout } from "@/lib/card-booking";
import { verifyWebhook } from "@/lib/payments";

/**
 * Stripe webhook. Point the endpoint at /api/webhooks/stripe and subscribe to
 * checkout.session.completed, checkout.session.async_payment_succeeded and
 * checkout.session.expired. Only events with a valid signature are trusted.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = verifyWebhook(await request.text(), signature);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return Response.json({ result: await completeCheckout(event.data.object) });
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return Response.json({ result: (await expireCheckout(event.data.object)) ? "released" : "ignored" });
    default:
      return Response.json({ result: "ignored" });
  }
}
