import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET() {
    return NextResponse.json({ status: "Stripe Checkout API is online" });
}

export async function POST(req: Request) {
    console.log("[STRIPE_CHECKOUT] POST request received");
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY || "";
        if (!stripeKey || !stripeKey.startsWith("sk_")) {
            console.error("[STRIPE_CHECKOUT] Missing STRIPE_SECRET_KEY in runtime environment");
            return NextResponse.json({
                error: "Stripe is not configured on the server (missing STRIPE_SECRET_KEY)."
            }, { status: 500 });
        }

        const body = await req.json();
        const { priceId, cycle, userId, email } = body;
        
        console.log("[STRIPE_CHECKOUT] Body:", { priceId, cycle, userId, email });

        if (!userId || !email) {
            console.log("[STRIPE_CHECKOUT] Missing fields");
            return new NextResponse("Missing required fields", { status: 400 });
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
                 // If already subscribed, return the billing portal URL instead of a new checkout session?
                 // Or just return an error. Returning an error is safer for now.
                 return NextResponse.json({
                     error: "You already have an active subscription.",
                     redirect: "/teacher/settings" // Suggest redirection
                 }, { status: 409 }); 
            }
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

        return NextResponse.json({
            error: "Internal Error",
        }, { status: 500 });
    }
}
