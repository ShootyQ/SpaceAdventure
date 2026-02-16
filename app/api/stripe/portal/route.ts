import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
    try {
        const stripeLib = await import('@/lib/stripe');
        const stripe = stripeLib.stripe;

        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
        }

        const body = await req.json();
        const { customerId } = body;
        
        // If we don't have a customerId on the client, we might need to look it up by email.
        // For now, let's assume the client passes the customerId stored in the user profile.
        // If the user doesn't have a stored customerId, we can't open the portal easily unless we search.
        
        let targetCustomerId = customerId;

        if (!targetCustomerId && body.email) {
             const customers = await stripe.customers.list({
                email: body.email,
                limit: 1,
            });
            if (customers.data.length > 0) {
                targetCustomerId = customers.data[0].id;
            }
        }

        if (!targetCustomerId) {
             return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.classcrave.com';

        const session = await stripe.billingPortal.sessions.create({
            customer: targetCustomerId,
            return_url: `${origin}/teacher`, // Return to the teacher portal
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[STRIPE_PORTAL]", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Internal server error",
        }, { status: 500 });
    }
}
