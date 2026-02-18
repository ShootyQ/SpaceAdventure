import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    console.log("[STRIPE_PORTAL] POST received");
    try {
        const stripeLib = await import('@/lib/stripe');
        const stripe = stripeLib.stripe;

        const stripeKey = process.env.STRIPE_SECRET_KEY || "";
        if (!stripeKey || !stripeKey.startsWith("sk_")) {
             console.error("[STRIPE_PORTAL] Stripe key error");
             return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
        }

        const body = await req.json();
        const { customerId } = body;
        console.log("[STRIPE_PORTAL] Body:", JSON.stringify(body));
        
        // If we don't have a customerId on the client, we might need to look it up by email.
        // For now, let's assume the client passes the customerId stored in the user profile.
        // If the user doesn't have a stored customerId, we can't open the portal easily unless we search.
        
        let targetCustomerId = customerId;

        if (!targetCustomerId && body.email) {
             console.log("[STRIPE_PORTAL] No customerId, searching by email:", body.email);
             const customers = await stripe.customers.list({
                email: body.email,
                limit: 1,
            });
            if (customers.data.length > 0) {
                targetCustomerId = customers.data[0].id;
                console.log("[STRIPE_PORTAL] Found customerId:", targetCustomerId);
            }
        }

        if (!targetCustomerId) {
             console.error("[STRIPE_PORTAL] No customerId found");
             return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.classcrave.com';

        const session = await stripe.billingPortal.sessions.create({
            customer: targetCustomerId,
            return_url: `${origin}/teacher`, // Return to the teacher portal
        });
        
        console.log("[STRIPE_PORTAL] Session created:", session.url);
        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[STRIPE_PORTAL]", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Internal server error",
        }, { status: 500 });
    }
}
