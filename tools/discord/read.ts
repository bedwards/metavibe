/**
 * Discord Read Tool
 *
 * Reads recent messages from a Discord channel.
 * Requires bot token (webhook-only access cannot read messages).
 *
 * Claude instances should use this to:
 * - Check if another Claude is working on main branch fixes
 * - See team announcements before starting work
 * - Coordinate on shared resources
 *
 * Usage:
 *   npm run discord:read
 *   npm run discord:read -- --limit 20
 *   npm run discord:read -- --filter "main branch"
 */

import { getConfig } from './config.js';

interface DiscordMessage {
  id: string;
  content: string;
  author: {
    username: string;
    bot: boolean;
  };
  timestamp: string;
  embeds?: Array<{
    title?: string;
    description?: string;
  }>;
}

interface ReadOptions {
  limit: number;
  filter?: string;
}

async function readMessages(options: ReadOptions): Promise<DiscordMessage[]> {
  const config = getConfig();

  if (!config.botToken) {
    throw new Error(
      'Reading messages requires DISCORD_BOT_TOKEN. Webhook-only access cannot read messages.'
    );
  }

  if (!config.channelId) {
    throw new Error(
      'DISCORD_CHANNEL_ID required to read messages. Set in .env or discord.config.json'
    );
  }

  const url = `https://discord.com/api/v10/channels/${config.channelId}/messages?limit=${options.limit}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${config.botToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord API failed: ${response.status} ${text}`);
  }

  let messages = await response.json() as DiscordMessage[];

  if (options.filter) {
    const filterLower = options.filter.toLowerCase();
    messages = messages.filter(msg => {
      const contentMatch = msg.content.toLowerCase().includes(filterLower);
      const embedMatch = msg.embeds?.some(
        e =>
          e.title?.toLowerCase().includes(filterLower) ||
          e.description?.toLowerCase().includes(filterLower)
      );
      return contentMatch || embedMatch;
    });
  }

  return messages;
}

function formatMessage(msg: DiscordMessage): string {
  const time = new Date(msg.timestamp).toLocaleString();
  const botTag = msg.author.bot ? ' [BOT]' : '';
  let output = `[${time}] ${msg.author.username}${botTag}:\n`;

  if (msg.content) {
    output += `  ${msg.content}\n`;
  }

  if (msg.embeds?.length) {
    for (const embed of msg.embeds) {
      if (embed.title) {output += `  📋 ${embed.title}\n`;}
      if (embed.description) {output += `  ${embed.description}\n`;}
    }
  }

  return output;
}

function parseArgs(): ReadOptions {
  const args = process.argv.slice(2);
  const options: ReadOptions = { limit: 10 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--limit':
      case '-l':
        options.limit = parseInt(value, 10);
        i++;
        break;
      case '--filter':
      case '-f':
        options.filter = value;
        i++;
        break;
    }
  }

  return options;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  readMessages(options)
    .then(messages => {
      if (messages.length === 0) {
        console.info('No messages found.');
        return;
      }

      console.info(`Found ${messages.length} messages:\n`);
      for (const msg of messages.reverse()) {
        console.info(formatMessage(msg));
      }
    })
    .catch((err: unknown) => {
      console.error('Failed to read messages:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}

export { readMessages };
export type { DiscordMessage, ReadOptions };
