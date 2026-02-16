import { NextResponse } from "next/server";
import Stripe from "stripe";

type SerializedPlan = {
  priceId: string;
  productId: string | null;
  amountCents: number;
  currency: string;
  interval: "month" | "year" | string;
  compareAtCents: number | null;
  discountPercent: number;
  savingsCents: number;
};

const serializePlan = async (
  stripe: Stripe,
  priceId: string
): Promise<SerializedPlan> => {
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });

  const currentAmount = price.unit_amount || 0;
  const interval = price.recurring?.interval || "month";
  const productId = typeof price.product === "string" ? price.product : price.product?.id || null;

  let compareAtCents: number | null = null;

  if (productId) {
    const allActiveRecurringPrices = await stripe.prices.list({
      active: true,
      product: productId,
      type: "recurring",
      limit: 100,
    });

    const sameIntervalAmounts = allActiveRecurringPrices.data
      .filter((candidate) => candidate.recurring?.interval === interval)
      .map((candidate) => candidate.unit_amount || 0)
      .filter((amount) => amount > 0);

    if (sameIntervalAmounts.length > 0) {
      const maxAmount = Math.max(...sameIntervalAmounts);
      compareAtCents = maxAmount > currentAmount ? maxAmount : null;
    }
  }

  const savingsCents = compareAtCents ? Math.max(compareAtCents - currentAmount, 0) : 0;
  const discountPercent = compareAtCents && compareAtCents > 0
    ? Math.round((savingsCents / compareAtCents) * 100)
    : 0;

  return {
    priceId: price.id,
    productId,
    amountCents: currentAmount,
    currency: price.currency || "usd",
    interval,
    compareAtCents,
    discountPercent,
    savingsCents,
  };
};

export async function GET() {
  try {
    const stripeLib = await import("@/lib/stripe");
    const stripe = stripeLib.stripe;

    if (!stripeLib.stripeInitialized) {
      return NextResponse.json(
        {
          error: `Stripe initialization failed: ${stripeLib.stripeInitErrorMessage || "Unknown Stripe init error"}`,
        },
        { status: 500 }
      );
    }

    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || "";
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || "";

    if (!monthlyPriceId || !yearlyPriceId) {
      return NextResponse.json(
        { error: "Missing Stripe monthly/yearly price IDs in environment." },
        { status: 500 }
      );
    }

    const [monthly, yearly] = await Promise.all([
      serializePlan(stripe, monthlyPriceId),
      serializePlan(stripe, yearlyPriceId),
    ]);

    return NextResponse.json(
      {
        monthly,
        yearly,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown pricing API error";
    return NextResponse.json({ error: `Pricing lookup failed: ${message}` }, { status: 500 });
  }
}
