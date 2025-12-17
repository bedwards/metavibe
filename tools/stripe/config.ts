/**
 * Stripe Configuration
 *
 * Initializes the Stripe client with credentials from .secrets
 *
 * Required environment variables (in .secrets):
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 * - STRIPE_PUBLISHABLE_KEY: Your publishable key (pk_test_... or pk_live_...)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret (whsec_...)
 *
 * Get keys from: https://dashboard.stripe.com/apikeys
 */

import Stripe from 'stripe';
import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Load .env first, then .secrets (secrets override env)
loadEnv();
loadSecrets();

function loadSecrets(): void {
  const secretsPath = join(process.cwd(), '.secrets');
  if (existsSync(secretsPath)) {
    const content = readFileSync(secretsPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  }
}

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  isTestMode: boolean;
}

export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    isTestMode: secretKey.startsWith('sk_test_'),
  };
}

export function validateStripeConfig(config: StripeConfig): void {
  if (!config.secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY not configured. Add it to .secrets file.\n' +
      'Get your key from: https://dashboard.stripe.com/apikeys'
    );
  }

  if (!config.secretKey.startsWith('sk_')) {
    throw new Error(
      'STRIPE_SECRET_KEY appears invalid. It should start with sk_test_ or sk_live_'
    );
  }
}

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const config = getStripeConfig();
  validateStripeConfig(config);

  stripeClient = new Stripe(config.secretKey);

  return stripeClient;
}

export function isStripeConfigured(): boolean {
  const config = getStripeConfig();
  return Boolean(config.secretKey);
}
