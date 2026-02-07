import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { priceId, userId, email } = await req.json();

        if (!userId || !email) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const line_items: any = [];

        if (priceId) {
            line_items.push({
                price: priceId,
                quantity: 1,
            });
        } else {
             // Fallback for Sandbox/Demo Mode if no Price ID is configured
             line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Class CRAVE Subscription (Monthly)',
                        description: 'Unlimited access to all teacher tools',
                    },
                    unit_amount: 1000, // $10.00
                    recurring: {
                        interval: 'month',
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
