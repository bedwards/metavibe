/**
 * Stripe Customer Management
 *
 * Utilities for managing Stripe customers and their subscriptions.
 *
 * Usage:
 *   npm run stripe:customer -- --email user@example.com
 *   npm run stripe:customer -- --id cus_xxx
 */

import Stripe from 'stripe';
import { getStripeConfig } from './config.js';
import { execSync } from 'child_process';

export interface CustomerInfo {
  id: string;
  email: string | null;
  name: string | null;
  created: Date;
  subscriptions: SubscriptionInfo[];
  defaultPaymentMethod: string | null;
}

export interface SubscriptionInfo {
  id: string;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  items: Array<{
    priceId: string;
    productId: string;
    quantity: number;
  }>;
}

/**
 * Look up a customer by email using Stripe CLI
 * (Synchronous wrapper for CLI usage)
 */
export function findCustomerByEmail(email: string): CustomerInfo | null {
  const config = getStripeConfig();

  if (!config.secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }

  try {
    // Use stripe CLI if available, otherwise instruct user
    const result = execSync(
      `stripe customers list --email "${email}" --limit 1 --api-key "${config.secretKey}" 2>/dev/null`,
      { encoding: 'utf-8' }
    );

    const data = JSON.parse(result) as { data: Stripe.Customer[] };

    if (data.data.length === 0) {
      return null;
    }

    const customer = data.data[0];
    return formatCustomer(customer);
  } catch {
    // Stripe CLI not available, provide guidance
    console.info('Note: Install Stripe CLI for better customer lookup:');
    console.info('  brew install stripe/stripe-cli/stripe');
    console.info('');
    throw new Error(
      'Customer lookup requires Stripe CLI or async context.\n' +
      'Use getStripeClient() in your API routes:\n\n' +
      'const customers = await stripe.customers.list({ email });'
    );
  }
}

/**
 * Get customer by ID using Stripe CLI
 */
export function getCustomer(customerId: string): CustomerInfo {
  const config = getStripeConfig();

  if (!config.secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }

  try {
    const result = execSync(
      `stripe customers retrieve "${customerId}" --api-key "${config.secretKey}" 2>/dev/null`,
      { encoding: 'utf-8' }
    );

    const customer = JSON.parse(result) as Stripe.Customer;
    return formatCustomer(customer);
  } catch {
    throw new Error(
      'Customer retrieval requires Stripe CLI or async context.\n' +
      'Use getStripeClient() in your API routes:\n\n' +
      'const customer = await stripe.customers.retrieve(customerId);'
    );
  }
}

function formatCustomer(customer: Stripe.Customer): CustomerInfo {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name ?? null,
    created: new Date(customer.created * 1000),
    subscriptions: [], // Would need separate API call
    defaultPaymentMethod: (() => {
      if (typeof customer.default_source === 'string') {
        return customer.default_source;
      }
      if (customer.default_source && 'id' in customer.default_source) {
        return customer.default_source.id;
      }
      return null;
    })(),
  };
}

function parseArgs(): { email?: string; id?: string } {
  const args = process.argv.slice(2);
  const options: { email?: string; id?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--email':
      case '-e':
        options.email = value;
        i++;
        break;
      case '--id':
      case '-i':
        options.id = value;
        i++;
        break;
    }
  }

  if (!options.email && !options.id) {
    console.error('Usage: npm run stripe:customer -- --email <email>');
    console.error('       npm run stripe:customer -- --id <customer_id>');
    console.error('');
    console.error('Options:');
    console.error('  --email, -e <email>  Look up customer by email');
    console.error('  --id, -i <id>        Get customer by Stripe ID (cus_xxx)');
    process.exit(1);
  }

  return options;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { email, id } = parseArgs();
  const config = getStripeConfig();

  console.info(`Stripe Mode: ${config.isTestMode ? 'TEST' : 'LIVE'}`);
  console.info('');

  try {
    let customer: CustomerInfo | null = null;

    if (id) {
      customer = getCustomer(id);
    } else if (email) {
      customer = findCustomerByEmail(email);
    }

    if (!customer) {
      console.info('Customer not found.');
      process.exit(0);
    }

    console.info('Customer:');
    console.info(`  ID: ${customer.id}`);
    console.info(`  Email: ${customer.email ?? '(not set)'}`);
    console.info(`  Name: ${customer.name ?? '(not set)'}`);
    console.info(`  Created: ${customer.created.toISOString()}`);
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
