import Stripe from 'stripe';

let stripeInitError: string | null = null;
let stripeClient: Stripe;

try {
  const rawKey = process.env.STRIPE_SECRET_KEY ?? '';
  const normalizedKey = rawKey.trim();
  const safeKey = normalizedKey || 'sk_test_placeholder';

  stripeClient = new Stripe(safeKey, {
    apiVersion: '2023-10-16' as any,
    typescript: true,
  });
} catch (error: any) {
  stripeInitError = error?.message || 'Unknown Stripe initialization error';
  stripeClient = new Stripe('sk_test_placeholder', {
    apiVersion: '2023-10-16' as any,
    typescript: true,
  });
}

export const stripe = stripeClient;
export const stripeInitialized = stripeInitError === null;
export const stripeInitErrorMessage = stripeInitError;
