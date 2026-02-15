import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session?.metadata?.userId;
    if (!userId) {
      return new NextResponse("User id is required", { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const firstItem = subscription.items.data[0];

    await adminDb.collection("users").doc(userId).update({
      subscriptionStatus: "active",
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: firstItem?.price?.id,
      stripeSubscriptionInterval: firstItem?.price?.recurring?.interval,
      subscriptionActivatedAt: new Date((subscription.start_date || subscription.created) * 1000),
      stripeCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      stripeLastPaymentAt: new Date(),
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = (typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id) as string | undefined;
    if (!subscriptionId) {
      return new NextResponse(null, { status: 200 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    const userSnap = await adminDb.collection("users").where("stripeSubscriptionId", "==", subscription.id).get();
    if (!userSnap.empty) {
      const targetDoc = userSnap.docs[0];
      await targetDoc.ref.update({
        subscriptionStatus: "active",
        stripeCustomerId: customerId,
        stripePriceId: subscription.items.data[0]?.price?.id,
        stripeSubscriptionInterval: subscription.items.data[0]?.price?.recurring?.interval,
        stripeCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        stripeLastPaymentAt: new Date(),
        stripeLastPaymentAmount: (invoice.amount_paid || 0) / 100,
        stripeCurrency: invoice.currency || "usd",
      });
    }
  }

  return new NextResponse(null, { status: 200 });
}
