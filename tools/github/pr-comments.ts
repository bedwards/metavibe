/**
 * GitHub PR Comments Reader
 *
 * Reads comments on pull requests, specifically looking for
 * comments from "Claude" (the GitHub Claude integration).
 *
 * IMPORTANT: Install the GitHub Claude integration on your repo:
 * https://github.com/apps/claude
 *
 * Usage:
 *   npx tsx tools/github/pr-comments.ts --pr 123
 *   npx tsx tools/github/pr-comments.ts --pr 123 --filter "Claude"
 */

import { execSync } from 'child_process';
import { checkRateLimit, canMakeRequests } from './check-rate-limit.js';

interface PrComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
  url: string;
  isFromClaude: boolean;
}

interface GhComment {
  id: number;
  author: {
    login: string;
  };
  body: string;
  createdAt: string;
  url: string;
}

export function getPrComments(prNumber: number): PrComment[] {
  const rateLimit = checkRateLimit();

  if (!canMakeRequests(rateLimit, 3)) {
    throw new Error('Rate limit too low to fetch PR comments.');
  }

  try {
    // Get PR comments using gh CLI
    const result = execSync(
      `gh pr view ${prNumber} --json comments --jq '.comments'`,
      {
        encoding: 'utf-8',
        env: { ...process.env },
      }
    );

    const comments = JSON.parse(result || '[]') as GhComment[];

    return comments.map(c => ({
      id: c.id,
      author: c.author.login,
      body: c.body,
      createdAt: c.createdAt,
      url: c.url,
      // Claude GitHub App comments come from user "claude" or "Claude"
      isFromClaude:
        c.author.login.toLowerCase() === 'claude' ||
        c.author.login.toLowerCase().includes('claude'),
    }));
  } catch (err) {
    throw new Error(`Failed to fetch PR #${prNumber} comments: ${err}`);
  }
}

export function getClaudeComments(prNumber: number): PrComment[] {
  const comments = getPrComments(prNumber);
  return comments.filter(c => c.isFromClaude);
}

export function getReviewComments(prNumber: number): PrComment[] {
  const rateLimit = checkRateLimit();

  if (!canMakeRequests(rateLimit, 3)) {
    throw new Error('Rate limit too low to fetch review comments.');
  }

  try {
    // Get review comments (inline code comments)
    const result = execSync(
      `gh api repos/{owner}/{repo}/pulls/${prNumber}/comments`,
      {
        encoding: 'utf-8',
        env: { ...process.env },
      }
    );

    interface ReviewComment {
      id: number;
      user: { login: string };
      body: string;
      created_at: string;
      html_url: string;
    }
    const comments = JSON.parse(result || '[]') as ReviewComment[];

    return comments.map((c) => ({
      id: c.id,
      author: c.user.login,
      body: c.body,
      createdAt: c.created_at,
      url: c.html_url,
      isFromClaude:
        c.user.login.toLowerCase() === 'claude' ||
        c.user.login.toLowerCase().includes('claude'),
    }));
  } catch (err) {
    throw new Error(`Failed to fetch PR #${prNumber} review comments: ${err}`);
  }
}

function formatComment(comment: PrComment): string {
  const time = new Date(comment.createdAt).toLocaleString();
  const claudeTag = comment.isFromClaude ? ' [CLAUDE]' : '';
  return `
[${time}] ${comment.author}${claudeTag}
${'-'.repeat(40)}
${comment.body}
${comment.url}
`;
}

function parseArgs(): { prNumber: number; filter?: string; claudeOnly: boolean } {
  const args = process.argv.slice(2);
  let prNumber = 0;
  let filter: string | undefined;
  let claudeOnly = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--pr':
      case '-p':
        prNumber = parseInt(value, 10);
        i++;
        break;
      case '--filter':
      case '-f':
        filter = value;
        i++;
        break;
      case '--claude':
      case '-c':
        claudeOnly = true;
        break;
    }
  }

  if (!prNumber) {
    console.error('Usage: npx tsx tools/github/pr-comments.ts --pr <number> [options]');
    console.error('Options:');
    console.error('  --filter <text>   Filter comments containing text');
    console.error('  --claude          Show only Claude comments');
    process.exit(1);
  }

  return { prNumber, filter, claudeOnly };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { prNumber, filter, claudeOnly } = parseArgs();

  try {
    let comments = claudeOnly
      ? getClaudeComments(prNumber)
      : getPrComments(prNumber);

    if (filter) {
      const filterLower = filter.toLowerCase();
      comments = comments.filter(c =>
        c.body.toLowerCase().includes(filterLower) ||
        c.author.toLowerCase().includes(filterLower)
      );
    }

    if (comments.length === 0) {
      console.info(`No${claudeOnly ? ' Claude' : ''} comments found on PR #${prNumber}`);
    } else {
      console.info(`Found ${comments.length} comments on PR #${prNumber}:\n`);
      for (const comment of comments) {
        console.info(formatComment(comment));
      }
    }
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export { getPrComments as default };
