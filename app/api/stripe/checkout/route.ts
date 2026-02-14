import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: "Stripe Checkout API is online" });
}

export async function POST(req: Request) {
    console.log("[STRIPE_CHECKOUT] POST request received");
    try {
        const body = await req.json();
        const { priceId, cycle, userId, email } = body;
        
        console.log("[STRIPE_CHECKOUT] Body:", { priceId, cycle, userId, email });

        if (!userId || !email) {
            console.log("[STRIPE_CHECKOUT] Missing fields");
            return new NextResponse("Missing required fields", { status: 400 });
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

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: line_items,
            mode: 'subscription',
            success_url: `${req.headers.get('origin')}/teacher/settings?success=true`,
            cancel_url: `${req.headers.get('origin')}/teacher/settings?canceled=true`,
            metadata: {
                userId: userId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[STRIPE_CHECKOUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
