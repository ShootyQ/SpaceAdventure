import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: '2023-10-16', // using a known stable version or update to match your dashboard
  typescript: true,
});
