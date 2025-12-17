/**
 * Discord Tool Configuration
 *
 * Configurable Discord integration for team communication.
 * Claude instances use this to coordinate work and avoid conflicts.
 *
 * Configuration precedence:
 * 1. Environment variables (.env)
 * 2. Project config file (discord.config.json)
 * 3. Defaults
 */

import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

loadEnv();

export interface DiscordConfig {
  webhookUrl: string;
  botToken?: string;
  channelId?: string;
  username: string;
  avatarUrl?: string;
  projectName: string;
  environment: string;
}

function loadProjectConfig(): Partial<DiscordConfig> {
  const configPath = join(process.cwd(), 'discord.config.json');

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as Partial<DiscordConfig>;
    } catch {
      console.warn('Failed to parse discord.config.json');
    }
  }

  return {};
}

export function getConfig(): DiscordConfig {
  const projectConfig = loadProjectConfig();

  const config: DiscordConfig = {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || projectConfig.webhookUrl || '',
    botToken: process.env.DISCORD_BOT_TOKEN || projectConfig.botToken,
    channelId: process.env.DISCORD_CHANNEL_ID || projectConfig.channelId,
    username: projectConfig.username || 'Claude Bot',
    avatarUrl: projectConfig.avatarUrl,
    projectName: projectConfig.projectName || process.env.npm_package_name || 'claude-base',
    environment: process.env.NODE_ENV || 'development',
  };

  return config;
}

export function validateConfig(config: DiscordConfig): void {
  if (!config.webhookUrl && !config.botToken) {
    throw new Error(
      'Discord not configured. Set DISCORD_WEBHOOK_URL in .env or create discord.config.json'
    );
  }
}
