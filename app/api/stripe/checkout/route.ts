import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { priceId, userId, email } = await req.json();

        if (!priceId || !userId || !email) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
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
