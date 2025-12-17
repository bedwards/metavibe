/**
 * Discord Send Tool
 *
 * Sends messages to Discord for team coordination.
 * Claude instances should use this to announce:
 * - Starting work on a branch/issue
 * - Completing work or creating PRs
 * - Encountering blockers
 * - Main branch issues that need attention
 *
 * Usage:
 *   npm run discord:send -- --message "Starting work on feature X"
 *   npm run discord:send -- --message "PR #123 ready for review" --mention
 *   npm run discord:send -- --type status --branch feature/login
 */

import { getConfig, validateConfig, type DiscordConfig } from './config.js';

interface MessageOptions {
  message: string;
  type?: 'info' | 'status' | 'error' | 'success';
  mention?: boolean;
  branch?: string;
  issueNumber?: number;
  prNumber?: number;
}

interface WebhookPayload {
  username: string;
  avatar_url?: string;
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
  }>;
}

const COLORS = {
  info: 0x5865f2,    // Discord blue
  status: 0x57f287,  // Green
  error: 0xed4245,   // Red
  success: 0x57f287, // Green
};

function buildPayload(options: MessageOptions, config: DiscordConfig): WebhookPayload {
  const { message, type = 'info', mention, branch, issueNumber, prNumber } = options;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (branch) {
    fields.push({ name: 'Branch', value: `\`${branch}\``, inline: true });
  }
  if (issueNumber) {
    fields.push({ name: 'Issue', value: `#${issueNumber}`, inline: true });
  }
  if (prNumber) {
    fields.push({ name: 'PR', value: `#${prNumber}`, inline: true });
  }

  fields.push({
    name: 'Environment',
    value: config.environment,
    inline: true,
  });

  const payload: WebhookPayload = {
    username: config.username,
    avatar_url: config.avatarUrl,
    content: mention ? '@here' : undefined,
    embeds: [
      {
        title: `[${config.projectName}] ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: message,
        color: COLORS[type],
        fields: fields.length > 0 ? fields : undefined,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return payload;
}

async function sendMessage(options: MessageOptions): Promise<void> {
  const config = getConfig();
  validateConfig(config);

  const payload = buildPayload(options, config);

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${text}`);
  }

  console.info('Message sent to Discord');
}

function parseArgs(): MessageOptions {
  const args = process.argv.slice(2);
  const options: Partial<MessageOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--message':
      case '-m':
        options.message = value;
        i++;
        break;
      case '--type':
      case '-t':
        options.type = value as MessageOptions['type'];
        i++;
        break;
      case '--mention':
        options.mention = true;
        break;
      case '--branch':
      case '-b':
        options.branch = value;
        i++;
        break;
      case '--issue':
      case '-i':
        options.issueNumber = parseInt(value, 10);
        i++;
        break;
      case '--pr':
      case '-p':
        options.prNumber = parseInt(value, 10);
        i++;
        break;
    }
  }

  if (!options.message) {
    console.error('Usage: npm run discord:send -- --message <message> [options]');
    console.error('Options:');
    console.error('  --type <info|status|error|success>  Message type (default: info)');
    console.error('  --mention                            Mention @here');
    console.error('  --branch <name>                      Branch name');
    console.error('  --issue <number>                     Issue number');
    console.error('  --pr <number>                        PR number');
    process.exit(1);
  }

  return options as MessageOptions;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  sendMessage(options).catch((err: unknown) => {
    console.error('Failed to send message:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

export { sendMessage };
export type { MessageOptions };
