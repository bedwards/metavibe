/**
 * Stripe Tools
 *
 * Configurable Stripe API integration for payment processing.
 *
 * Setup:
 * 1. Add Stripe keys to .secrets:
 *    STRIPE_SECRET_KEY=sk_test_...
 *    STRIPE_PUBLISHABLE_KEY=pk_test_...
 *    STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * 2. Get keys from: https://dashboard.stripe.com/apikeys
 *
 * Usage in code:
 *   import { getStripeClient, isStripeConfigured } from './tools/stripe/index.js';
 *
 *   if (isStripeConfigured()) {
 *     const stripe = getStripeClient();
 *     const session = await stripe.checkout.sessions.create({ ... });
 *   }
 *
 * CLI tools:
 *   npm run stripe:customer -- --email user@example.com
 */

// Configuration
export {
  getStripeClient,
  getStripeConfig,
  validateStripeConfig,
  isStripeConfigured,
} from './config.js';
export type { StripeConfig } from './config.js';

// Checkout
export type { CheckoutOptions, CheckoutResult } from './checkout.js';

// Webhooks
export {
  verifyWebhookSignature,
  handleWebhook,
  handleWebhookAsync,
  WEBHOOK_EVENTS,
} from './webhooks.js';
export type { WebhookEventType, WebhookHandler, WebhookHandlers } from './webhooks.js';

// Customers
export {
  findCustomerByEmail,
  getCustomer,
} from './customers.js';
export type { CustomerInfo, SubscriptionInfo } from './customers.js';

// Re-export Stripe types for convenience
export type { Stripe } from 'stripe';
