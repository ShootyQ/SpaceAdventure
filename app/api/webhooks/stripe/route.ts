import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing"]);

const toAppSubscriptionStatus = (stripeStatus?: string) => {
  return stripeStatus && ACTIVE_STRIPE_STATUSES.has(stripeStatus) ? "active" : "trial";
};

export async function GET() {
  try {
    const stripeLib = await import("@/lib/stripe");
    const adminLib = await import("@/lib/firebase-admin");

    return NextResponse.json({
      ok: true,
      route: "stripe-webhook",
      expects: "POST from Stripe",
      adminInitialized: adminLib.adminInitialized,
      stripeInitialized: stripeLib.stripeInitialized,
      stripeInitError: stripeLib.stripeInitErrorMessage || null,
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      adminInitError: adminLib.adminInitError || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook GET init error";
    return NextResponse.json({ error: `Webhook diagnostics failed: ${message}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const stripeLib = await import("@/lib/stripe");
  const adminLib = await import("@/lib/firebase-admin");
  const stripe = stripeLib.stripe;
  const adminDb = adminLib.adminDb;

  if (!adminLib.adminInitialized) {
    console.error("[STRIPE_WEBHOOK] Firebase Admin is not initialized.", adminLib.adminInitError || "Missing FIREBASE_CLIENT_EMAIL and/or FIREBASE_PRIVATE_KEY.");
    return new NextResponse(`Webhook Error: Firebase Admin not configured${adminLib.adminInitError ? ` (${adminLib.adminInitError})` : ""}`, { status: 500 });
  }

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
      subscriptionStatus: toAppSubscriptionStatus(subscription.status),
      subscriptionLifecycleStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: firstItem?.price?.id,
      stripeSubscriptionInterval: firstItem?.price?.recurring?.interval,
      stripeCancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
      subscriptionActivatedAt: new Date((subscription.start_date || subscription.created) * 1000),
      stripeCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      stripeLastPaymentAt: new Date(),
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const invoiceAny = invoice as any;
    const subscriptionId = (
      typeof invoiceAny.subscription === "string"
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id || invoiceAny.parent?.subscription_details?.subscription
    ) as string | undefined;
    if (!subscriptionId) {
      return new NextResponse(null, { status: 200 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    const userSnap = await adminDb.collection("users").where("stripeSubscriptionId", "==", subscription.id).get();
    if (!userSnap.empty) {
      const targetDoc = userSnap.docs[0];
      await targetDoc.ref.update({
        subscriptionStatus: toAppSubscriptionStatus(subscription.status),
        subscriptionLifecycleStatus: subscription.status,
        stripeCustomerId: customerId,
        stripePriceId: subscription.items.data[0]?.price?.id,
        stripeSubscriptionInterval: subscription.items.data[0]?.price?.recurring?.interval,
        stripeCancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
        stripeCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        stripeLastPaymentAt: new Date(),
        stripeLastPaymentAmount: (invoice.amount_paid || 0) / 100,
        stripeCurrency: invoice.currency || "usd",
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;

    const userSnap = await adminDb
      .collection("users")
      .where("stripeSubscriptionId", "==", subscription.id)
      .get();

    if (!userSnap.empty) {
      const firstItem = subscription.items.data[0];
      await userSnap.docs[0].ref.update({
        subscriptionStatus: toAppSubscriptionStatus(subscription.status),
        subscriptionLifecycleStatus: subscription.status,
        stripePriceId: firstItem?.price?.id,
        stripeSubscriptionInterval: firstItem?.price?.recurring?.interval,
        stripeCancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
        stripeCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    const userSnap = await adminDb
      .collection("users")
      .where("stripeSubscriptionId", "==", subscription.id)
      .get();

    if (!userSnap.empty) {
      await userSnap.docs[0].ref.update({
        subscriptionStatus: "trial",
        subscriptionLifecycleStatus: subscription.status || "canceled",
        stripeCancelAtPeriodEnd: false,
        stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const invoiceAny = invoice as any;
    const subscriptionId = (
      typeof invoiceAny.subscription === "string"
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id || invoiceAny.parent?.subscription_details?.subscription
    ) as string | undefined;

    if (subscriptionId) {
      const userSnap = await adminDb
        .collection("users")
        .where("stripeSubscriptionId", "==", subscriptionId)
        .get();

      if (!userSnap.empty) {
        await userSnap.docs[0].ref.update({
          subscriptionStatus: "trial",
          subscriptionLifecycleStatus: "past_due",
          stripeLastPaymentAt: new Date(),
        });
      }
    }
  }

  return new NextResponse(null, { status: 200 });
}
