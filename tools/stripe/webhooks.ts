/**
 * Stripe Webhook Handling
 *
 * Utilities for verifying and handling Stripe webhooks.
 *
 * IMPORTANT: Webhooks must be handled in your API routes.
 * This module provides verification and type utilities.
 *
 * Setup:
 * 1. Create webhook endpoint in Stripe Dashboard
 * 2. Add STRIPE_WEBHOOK_SECRET to .secrets
 * 3. Use verifyWebhookSignature() in your endpoint
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeConfig } from './config.js';

export type WebhookEventType =
  | 'checkout.session.completed'
  | 'checkout.session.expired'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed';

export interface WebhookHandler {
  (event: Stripe.Event): void | Promise<void>;
}

export interface WebhookHandlers {
  [eventType: string]: WebhookHandler;
}

/**
 * Verify a webhook signature and parse the event
 *
 * @param payload - Raw request body (as string or Buffer)
 * @param signature - Stripe-Signature header value
 * @returns Parsed and verified Stripe event
 * @throws Error if signature verification fails
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const config = getStripeConfig();

  if (!config.webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET not configured. Add it to .secrets file.\n' +
      'Get your webhook secret from: https://dashboard.stripe.com/webhooks'
    );
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.webhookSecret
  );
}

/**
 * Create a webhook handler middleware
 *
 * Example usage in Express:
 * ```ts
 * app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
 *   const result = handleWebhook(req.body, req.headers['stripe-signature'], {
 *     'checkout.session.completed': (event) => {
 *       const session = event.data.object as Stripe.Checkout.Session;
 *       console.log('Checkout completed:', session.id);
 *     },
 *   });
 *   res.json(result);
 * });
 * ```
 */
export function handleWebhook(
  payload: string | Buffer,
  signature: string | undefined,
  handlers: WebhookHandlers
): { received: boolean; type: string } {
  if (!signature) {
    throw new Error('Missing Stripe-Signature header');
  }

  const event = verifyWebhookSignature(payload, signature);

  const handler = handlers[event.type];
  if (handler) {
    // Note: If handler is async, caller must await the result
    const result = handler(event);
    if (result instanceof Promise) {
      throw new Error(
        'Async webhook handlers must be awaited. ' +
        'Use handleWebhookAsync() instead or await the handler result.'
      );
    }
  }

  return { received: true, type: event.type };
}

/**
 * Async version of handleWebhook for async handlers
 */
export async function handleWebhookAsync(
  payload: string | Buffer,
  signature: string | undefined,
  handlers: WebhookHandlers
): Promise<{ received: boolean; type: string }> {
  if (!signature) {
    throw new Error('Missing Stripe-Signature header');
  }

  const event = verifyWebhookSignature(payload, signature);

  const handler = handlers[event.type];
  if (handler) {
    await handler(event);
  }

  return { received: true, type: event.type };
}

/**
 * Common webhook event types for quick reference
 */
export const WEBHOOK_EVENTS = {
  // Checkout
  CHECKOUT_COMPLETED: 'checkout.session.completed' as const,
  CHECKOUT_EXPIRED: 'checkout.session.expired' as const,

  // Subscriptions
  SUBSCRIPTION_CREATED: 'customer.subscription.created' as const,
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated' as const,
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted' as const,

  // Invoices
  INVOICE_PAID: 'invoice.paid' as const,
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed' as const,

  // Payment Intents
  PAYMENT_SUCCEEDED: 'payment_intent.succeeded' as const,
  PAYMENT_FAILED: 'payment_intent.payment_failed' as const,
} as const;

// CLI info if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.info('Stripe Webhook Utilities');
  console.info('========================');
  console.info('');
  console.info('This module provides webhook verification utilities.');
  console.info('Use in your API routes, not as a CLI tool.');
  console.info('');
  console.info('Example:');
  console.info('  import { verifyWebhookSignature, handleWebhookAsync } from "./tools/stripe/webhooks.js";');
  console.info('');
  console.info('Common event types:');
  for (const [name, type] of Object.entries(WEBHOOK_EVENTS)) {
    console.info(`  ${name}: "${type}"`);
  }
}
