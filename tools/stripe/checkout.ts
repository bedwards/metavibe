/**
 * Stripe Checkout Session Management
 *
 * Create and manage Stripe Checkout sessions for payments.
 *
 * Usage:
 *   npm run stripe:checkout -- --price price_xxx --success-url http://localhost:3000/success
 */

import Stripe from 'stripe';
import { getStripeClient } from './config.js';

export interface CheckoutOptions {
  priceId?: string;
  amount?: number;
  currency?: string;
  productName?: string;
  successUrl: string;
  cancelUrl?: string;
  customerEmail?: string;
  mode?: 'payment' | 'subscription' | 'setup';
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
  isTestMode: boolean;
}

export function createCheckoutSession(options: CheckoutOptions): CheckoutResult {
  // Validate config early
  getStripeClient();

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: options.mode ?? 'payment',
    success_url: options.successUrl,
    cancel_url: options.cancelUrl ?? options.successUrl,
    metadata: options.metadata,
  };

  if (options.customerEmail) {
    params.customer_email = options.customerEmail;
  }

  // Use price ID if provided, otherwise create line item from amount
  if (options.priceId) {
    params.line_items = [{ price: options.priceId, quantity: 1 }];
  } else if (options.amount) {
    params.line_items = [{
      price_data: {
        currency: options.currency ?? 'usd',
        product_data: {
          name: options.productName ?? 'Payment',
        },
        unit_amount: options.amount, // Amount in cents
      },
      quantity: 1,
    }];
  } else {
    throw new Error('Either priceId or amount must be provided');
  }

  // Synchronous approach using execSync to call stripe CLI or API
  // For a foundation, we provide the structure - actual async implementation
  // would be in the consuming project's API routes
  throw new Error(
    'NOT IMPLEMENTED: createCheckoutSession requires async context.\n' +
    'Use getStripeClient() in your API routes instead:\n\n' +
    'const session = await stripe.checkout.sessions.create(params);'
  );
}

/**
 * Retrieve a checkout session by ID
 */
export function getCheckoutSession(_sessionId: string): Stripe.Checkout.Session {
  throw new Error(
    'NOT IMPLEMENTED: getCheckoutSession requires async context.\n' +
    'Use getStripeClient() in your API routes instead:\n\n' +
    'const session = await stripe.checkout.sessions.retrieve(sessionId);'
  );
}

function parseArgs(): CheckoutOptions {
  const args = process.argv.slice(2);
  const options: Partial<CheckoutOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--price':
      case '-p':
        options.priceId = value;
        i++;
        break;
      case '--amount':
      case '-a':
        options.amount = parseInt(value, 10);
        i++;
        break;
      case '--currency':
        options.currency = value;
        i++;
        break;
      case '--product-name':
        options.productName = value;
        i++;
        break;
      case '--success-url':
        options.successUrl = value;
        i++;
        break;
      case '--cancel-url':
        options.cancelUrl = value;
        i++;
        break;
      case '--email':
        options.customerEmail = value;
        i++;
        break;
      case '--mode':
        options.mode = value as 'payment' | 'subscription' | 'setup';
        i++;
        break;
    }
  }

  if (!options.successUrl) {
    console.error('Usage: npm run stripe:checkout -- --price <price_id> --success-url <url>');
    console.error('       npm run stripe:checkout -- --amount <cents> --success-url <url>');
    console.error('');
    console.error('Options:');
    console.error('  --price <id>         Stripe Price ID (price_xxx)');
    console.error('  --amount <cents>     Amount in cents (alternative to price)');
    console.error('  --currency <code>    Currency code (default: usd)');
    console.error('  --product-name <n>   Product name for ad-hoc amounts');
    console.error('  --success-url <url>  Redirect URL on success (required)');
    console.error('  --cancel-url <url>   Redirect URL on cancel');
    console.error('  --email <email>      Pre-fill customer email');
    console.error('  --mode <mode>        payment|subscription|setup (default: payment)');
    process.exit(1);
  }

  return options as CheckoutOptions;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  try {
    const result = createCheckoutSession(options);
    console.info('Checkout session created:');
    console.info(`  Session ID: ${result.sessionId}`);
    console.info(`  URL: ${result.url}`);
    console.info(`  Mode: ${result.isTestMode ? 'TEST' : 'LIVE'}`);
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
