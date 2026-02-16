import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const ACTIVE_STRIPE_STATUSES = new Set(['active', 'trialing']);

const toAppSubscriptionStatus = (stripeStatus?: string) => {
    return stripeStatus && ACTIVE_STRIPE_STATUSES.has(stripeStatus) ? 'active' : 'trial';
};

export async function GET() {
    try {
        const stripeLib = await import('@/lib/stripe');

    return NextResponse.json({
        status: "Stripe Checkout API is online",
        hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
            stripeInitialized: stripeLib.stripeInitialized,
            stripeInitError: stripeLib.stripeInitErrorMessage || null,
        hasMonthlyPriceId: Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY),
        hasYearlyPriceId: Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY),
            adminSyncInCheckout: false,
    });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown checkout GET init error';
        return NextResponse.json({ error: `Checkout diagnostics failed: ${message}` }, { status: 500 });
    }
}

export async function POST(req: Request) {
    console.log("[STRIPE_CHECKOUT] POST request received");
    try {
        const stripeLib = await import('@/lib/stripe');
        const stripe = stripeLib.stripe;

        const stripeKey = process.env.STRIPE_SECRET_KEY || "";
        if (!stripeKey || !stripeKey.startsWith("sk_")) {
            console.error("[STRIPE_CHECKOUT] Missing STRIPE_SECRET_KEY in runtime environment");
            return NextResponse.json({
                error: "Stripe is not configured on the server (missing STRIPE_SECRET_KEY)."
            }, { status: 500 });
        }

        if (!stripeLib.stripeInitialized) {
            return NextResponse.json({
                error: `Stripe initialization failed: ${stripeLib.stripeInitErrorMessage || 'Unknown Stripe init error'}`
            }, { status: 500 });
        }

        const body = await req.json();
        const { priceId, cycle, userId, email, syncOnly } = body;
        
        console.log("[STRIPE_CHECKOUT] Body:", { priceId, cycle, userId, email, syncOnly: Boolean(syncOnly) });

        if (!userId || !email) {
            console.log("[STRIPE_CHECKOUT] Missing fields");
            return NextResponse.json({
                error: "Missing required fields: userId and email are required."
            }, { status: 400 });
        }

        // Check for existing customers/subscriptions by email to prevent double-subscription
        // This handles cases where our DB might be out of sync (e.g. missed webhooks)
        const customers = await stripe.customers.list({
            email: email,
            limit: 1,
            expand: ['data.subscriptions']
        });

        if (customers.data.length > 0) {
            const customer = customers.data[0];
            const activeSubscription = customer.subscriptions?.data.find(
                (sub) => sub.status === 'active' || sub.status === 'trialing'
            );

            if (activeSubscription) {
                const firstItem = activeSubscription.items.data[0];

                return NextResponse.json({
                    alreadySubscribed: true,
                    message: 'You already have an active subscription.',
                    synced: false,
                    syncError: 'Checkout route does not perform server-side Firebase sync.',
                    subscription: {
                        status: activeSubscription.status,
                        id: activeSubscription.id,
                        customerId: typeof activeSubscription.customer === 'string' ? activeSubscription.customer : activeSubscription.customer?.id,
                        priceId: firstItem?.price?.id || null,
                        interval: firstItem?.price?.recurring?.interval || null,
                        cancelAtPeriodEnd: (activeSubscription as any).cancel_at_period_end || false,
                        currentPeriodStart: (activeSubscription as any).current_period_start
                            ? new Date((activeSubscription as any).current_period_start * 1000).toISOString()
                            : null,
                        currentPeriodEnd: (activeSubscription as any).current_period_end
                            ? new Date((activeSubscription as any).current_period_end * 1000).toISOString()
                            : null,
                    },
                });
            }
        }

        if (syncOnly) {
            return NextResponse.json({
                alreadySubscribed: false,
                synced: false,
                message: 'No active subscription found for this email.',
            });
        }

        const line_items: any = [];

        if (priceId) {
            line_items.push({
                price: priceId,
                quantity: 1,
            });
        } else {
            const normalizedCycle = cycle === 'yearly' ? 'yearly' : 'monthly';
            const isYearly = normalizedCycle === 'yearly';

            // Fallback for Sandbox/Demo Mode if no Price ID is configured.
            // NOTE: Production should ideally pass a real Stripe Price ID.
            line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `ClassCrave Teacher License (${isYearly ? 'Yearly' : 'Monthly'})`,
                        description: 'Access to teacher tools and classroom management game worlds',
                    },
                    unit_amount: isYearly ? 8000 : 1000, // $80/year or $10/month
                    recurring: {
                        interval: isYearly ? 'year' : 'month',
                    },
                },
                quantity: 1,
            });
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.classcrave.com';

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: line_items,
            mode: 'subscription',
            success_url: `${origin}/teacher/settings?success=true`,
            cancel_url: `${origin}/teacher/settings?canceled=true`,
            metadata: {
                userId: userId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[STRIPE_CHECKOUT]", error);

        if (error instanceof Stripe.errors.StripeError) {
            return NextResponse.json({
                error: error.message,
                code: error.code || null,
                type: error.type || null,
            }, { status: 500 });
        }

        const fallbackMessage = error instanceof Error ? error.message : "Unknown server error";
        return NextResponse.json({
            error: `Internal Error: ${fallbackMessage}`,
        }, { status: 500 });
    }
}
