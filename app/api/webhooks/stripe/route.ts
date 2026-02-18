import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing"]);

const toAppSubscriptionStatus = (stripeStatus?: string) => {
  return stripeStatus && ACTIVE_STRIPE_STATUSES.has(stripeStatus) ? "active" : "trial";
};

type DiscountDetails = {
  amount: number;
  promoCode: string | null;
  couponId: string | null;
};

const getStripeMode = () => {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "unknown";
};

const getSubscriptionIdFromInvoice = (invoice: Stripe.Invoice) => {
  const invoiceAny = invoice as any;
  return (
    (typeof invoiceAny.subscription === "string"
      ? invoiceAny.subscription
      : invoiceAny.subscription?.id || invoiceAny.parent?.subscription_details?.subscription) || null
  ) as string | null;
};

const extractDiscountDetailsFromSession = async (stripe: Stripe, session: Stripe.Checkout.Session): Promise<DiscountDetails> => {
  const amount = Number(session.total_details?.amount_discount || 0) / 100;
  const discounts = (session as any).discounts as Array<any> | undefined;
  const firstDiscount = discounts?.[0]?.discount;

  let promoCode: string | null = null;
  let couponId: string | null = null;

  try {
    const promoRef = typeof firstDiscount?.promotion_code === "string"
      ? firstDiscount.promotion_code
      : firstDiscount?.promotion_code?.id;

    if (promoRef) {
      const promo = await stripe.promotionCodes.retrieve(promoRef);
      const promoAny = promo as any;
      promoCode = promoAny?.code || null;
      couponId = typeof promoAny?.coupon === "string" ? promoAny.coupon : promoAny?.coupon?.id || null;
    } else {
      couponId = typeof firstDiscount?.coupon === "string" ? firstDiscount.coupon : firstDiscount?.coupon?.id || null;
    }
  } catch {
    // Keep amount-only discount data if Stripe promotion lookup is unavailable.
  }

  return { amount, promoCode, couponId };
};

const extractDiscountDetailsFromInvoice = (invoice: Stripe.Invoice): DiscountDetails => {
  const invoiceAny = invoice as any;

  let amount = 0;
  const totalDiscountAmounts = invoiceAny.total_discount_amounts as Array<{ amount?: number }> | undefined;
  if (Array.isArray(totalDiscountAmounts)) {
    amount = totalDiscountAmounts.reduce((sum, row) => sum + Number(row?.amount || 0), 0) / 100;
  }

  const promoCode = invoiceAny.discount?.promotion_code?.code || null;
  const couponId = invoiceAny.discount?.coupon?.id || null;

  return { amount, promoCode, couponId };
};

async function getWebhookHealthSummary(adminDb: any) {
  try {
    const recent = await adminDb
      .collection("stripe-webhook-events")
      .orderBy("processedAt", "desc")
      .limit(25)
      .get();

    const recentRows = recent.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }));

    const lastReceived = recentRows[0] || null;
    const lastSuccess = recentRows.find((row: any) => row.status === "success") || null;
    const lastFailure = recentRows.find((row: any) => row.status === "failed") || null;
    const failureCount = recentRows.filter((row: any) => row.status === "failed").length;
    const duplicateCount = recentRows.filter((row: any) => row.status === "duplicate").length;

    return {
      lastReceivedAt: lastReceived?.processedAt || null,
      lastReceivedType: lastReceived?.type || null,
      lastSuccessAt: lastSuccess?.processedAt || null,
      lastFailureAt: lastFailure?.processedAt || null,
      recentFailureCount: failureCount,
      recentDuplicateCount: duplicateCount,
      recentEvents: recentRows.slice(0, 8).map((row: any) => ({
        id: row.id,
        type: row.type || null,
        status: row.status || null,
        processedAt: row.processedAt || null,
      })),
    };
  } catch {
    return {
      lastReceivedAt: null,
      lastReceivedType: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      recentFailureCount: 0,
      recentDuplicateCount: 0,
      recentEvents: [],
    };
  }
}

export async function GET() {
  try {
    const stripeLib = await import("@/lib/stripe");
    const adminLib = await import("@/lib/firebase-admin");

    const health = adminLib.adminInitialized ? await getWebhookHealthSummary(adminLib.adminDb) : null;

    return NextResponse.json({
      ok: true,
      route: "stripe-webhook",
      expects: "POST from Stripe",
      stripeMode: getStripeMode(),
      hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      adminInitialized: adminLib.adminInitialized,
      stripeInitialized: stripeLib.stripeInitialized,
      stripeInitError: stripeLib.stripeInitErrorMessage || null,
      adminInitError: adminLib.adminInitError || null,
      health,
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
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const eventRef = adminDb.collection("stripe-webhook-events").doc(event.id);
  const existing = await eventRef.get();
  if (existing.exists) {
    const prev = existing.data() as any;
    if (prev?.status === "success" || prev?.status === "ignored" || prev?.status === "duplicate") {
      await eventRef.set(
        {
          status: "duplicate",
          duplicateAt: new Date(),
        },
        { merge: true }
      );
      return new NextResponse(null, { status: 200 });
    }
  }

  await eventRef.set(
    {
      eventId: event.id,
      type: event.type,
      status: "processing",
      stripeCreatedAt: new Date(event.created * 1000),
      processedAt: new Date(),
    },
    { merge: true }
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session?.metadata?.userId;
      if (!userId) {
        await eventRef.set({ status: "ignored", reason: "missing-user-id", processedAt: new Date() }, { merge: true });
        return new NextResponse(null, { status: 200 });
      }

      if (!session.subscription) {
        await eventRef.set({ status: "ignored", reason: "missing-subscription", processedAt: new Date(), userId }, { merge: true });
        return new NextResponse(null, { status: 200 });
      }

      const discount = await extractDiscountDetailsFromSession(stripe, session);
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const firstItem = subscription.items.data[0];

      await adminDb.collection("users").doc(userId).set(
        {
          subscriptionStatus: toAppSubscriptionStatus(subscription.status),
          subscriptionLifecycleStatus: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: firstItem?.price?.id || null,
          stripeSubscriptionInterval: firstItem?.price?.recurring?.interval || null,
          stripeCancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
          subscriptionActivatedAt: new Date((subscription.start_date || subscription.created) * 1000),
          stripeCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          stripeLastPaymentAt: new Date(),
          stripeLastDiscountAmount: discount.amount || 0,
          stripeLastPromoCode: discount.promoCode,
          stripeLastCouponId: discount.couponId,
        },
        { merge: true }
      );

      await eventRef.set(
        {
          status: "success",
          processedAt: new Date(),
          userId,
          customerId: subscription.customer as string,
          subscriptionId: subscription.id,
        },
        { merge: true }
      );

      return new NextResponse(null, { status: 200 });
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);
      if (!subscriptionId) {
        await eventRef.set({ status: "ignored", reason: "missing-subscription", processedAt: new Date() }, { merge: true });
        return new NextResponse(null, { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const discount = extractDiscountDetailsFromInvoice(invoice);

      const userSnap = await adminDb.collection("users").where("stripeSubscriptionId", "==", subscription.id).get();
      if (!userSnap.empty) {
        const targetDoc = userSnap.docs[0];
        await targetDoc.ref.set(
          {
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
            stripeLastInvoiceId: invoice.id || null,
            stripeLastDiscountAmount: discount.amount || 0,
            stripeLastPromoCode: discount.promoCode,
            stripeLastCouponId: discount.couponId,
          },
          { merge: true }
        );

        await eventRef.set(
          {
            status: "success",
            processedAt: new Date(),
            userId: targetDoc.id,
            customerId,
            subscriptionId,
          },
          { merge: true }
        );
      } else {
        await eventRef.set(
          {
            status: "ignored",
            reason: "subscription-user-not-found",
            processedAt: new Date(),
            subscriptionId,
            customerId,
          },
          { merge: true }
        );
      }

      return new NextResponse(null, { status: 200 });
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const userSnap = await adminDb
        .collection("users")
        .where("stripeSubscriptionId", "==", subscription.id)
        .get();

      if (!userSnap.empty) {
        const firstItem = subscription.items.data[0];
        await userSnap.docs[0].ref.set(
          {
            subscriptionStatus: toAppSubscriptionStatus(subscription.status),
            subscriptionLifecycleStatus: subscription.status,
            stripePriceId: firstItem?.price?.id,
            stripeSubscriptionInterval: firstItem?.price?.recurring?.interval,
            stripeCancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
            stripeCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
          { merge: true }
        );

        await eventRef.set(
          {
            status: "success",
            processedAt: new Date(),
            userId: userSnap.docs[0].id,
            customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
            subscriptionId: subscription.id,
          },
          { merge: true }
        );
      } else {
        await eventRef.set(
          {
            status: "ignored",
            reason: "subscription-user-not-found",
            processedAt: new Date(),
            subscriptionId: subscription.id,
          },
          { merge: true }
        );
      }

      return new NextResponse(null, { status: 200 });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      const userSnap = await adminDb
        .collection("users")
        .where("stripeSubscriptionId", "==", subscription.id)
        .get();

      if (!userSnap.empty) {
        await userSnap.docs[0].ref.set(
          {
            subscriptionStatus: "trial",
            subscriptionLifecycleStatus: subscription.status || "canceled",
            stripeCancelAtPeriodEnd: false,
            stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
          { merge: true }
        );

        await eventRef.set(
          {
            status: "success",
            processedAt: new Date(),
            userId: userSnap.docs[0].id,
            customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
            subscriptionId: subscription.id,
          },
          { merge: true }
        );
      } else {
        await eventRef.set(
          {
            status: "ignored",
            reason: "subscription-user-not-found",
            processedAt: new Date(),
            subscriptionId: subscription.id,
          },
          { merge: true }
        );
      }

      return new NextResponse(null, { status: 200 });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);

      if (subscriptionId) {
        const userSnap = await adminDb
          .collection("users")
          .where("stripeSubscriptionId", "==", subscriptionId)
          .get();

        if (!userSnap.empty) {
          await userSnap.docs[0].ref.set(
            {
              subscriptionStatus: "trial",
              subscriptionLifecycleStatus: "past_due",
              stripeLastPaymentAt: new Date(),
            },
            { merge: true }
          );

          await eventRef.set(
            {
              status: "success",
              processedAt: new Date(),
              userId: userSnap.docs[0].id,
              subscriptionId,
              customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
            },
            { merge: true }
          );
        } else {
          await eventRef.set(
            {
              status: "ignored",
              reason: "subscription-user-not-found",
              processedAt: new Date(),
              subscriptionId,
            },
            { merge: true }
          );
        }
      } else {
        await eventRef.set({ status: "ignored", reason: "missing-subscription", processedAt: new Date() }, { merge: true });
      }

      return new NextResponse(null, { status: 200 });
    }

    await eventRef.set(
      {
        status: "ignored",
        reason: `unhandled-type:${event.type}`,
        processedAt: new Date(),
      },
      { merge: true }
    );

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown webhook processing error";
    await eventRef.set(
      {
        status: "failed",
        processedAt: new Date(),
        errorMessage,
      },
      { merge: true }
    );

    console.error("[STRIPE_WEBHOOK] Processing failed", error);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 500 });
  }
}
