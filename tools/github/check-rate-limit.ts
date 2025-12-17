/**
 * GitHub Rate Limit Checker
 *
 * Checks current GitHub API rate limits before performing operations.
 * Uses gh CLI which primarily uses GitHub GraphQL API.
 *
 * IMPORTANT: Do not modify global gh config. Multiple Claude instances
 * may be running on the same machine. Use local config via environment.
 *
 * Usage:
 *   npm run gh:rate-limit
 */

import { execSync } from 'child_process';

interface RateLimitInfo {
  core: {
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  };
  graphql: {
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  };
}

interface GhRateLimitResponse {
  resources: {
    core: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
    };
    graphql: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
    };
  };
}

export function checkRateLimit(): RateLimitInfo {
  try {
    // Use gh api to check rate limit
    // gh CLI handles auth automatically
    const result = execSync('gh api rate_limit', {
      encoding: 'utf-8',
      // Don't modify global config - use local environment
      env: { ...process.env },
    });

    const data = JSON.parse(result) as GhRateLimitResponse;

    return {
      core: {
        limit: data.resources.core.limit,
        remaining: data.resources.core.remaining,
        reset: new Date(data.resources.core.reset * 1000),
        used: data.resources.core.used,
      },
      graphql: {
        limit: data.resources.graphql.limit,
        remaining: data.resources.graphql.remaining,
        reset: new Date(data.resources.graphql.reset * 1000),
        used: data.resources.graphql.used,
      },
    };
  } catch (err) {
    throw new Error(
      `Failed to check rate limit. Ensure gh CLI is authenticated: gh auth login\n${err}`
    );
  }
}

export function canMakeRequests(info: RateLimitInfo, needed: number = 1): boolean {
  // Check both REST (core) and GraphQL limits
  // gh CLI uses GraphQL for most operations
  return info.graphql.remaining >= needed && info.core.remaining >= needed;
}

export function getWaitTime(info: RateLimitInfo): number {
  const now = Date.now();
  const graphqlWait = Math.max(0, info.graphql.reset.getTime() - now);
  const coreWait = Math.max(0, info.core.reset.getTime() - now);
  return Math.max(graphqlWait, coreWait);
}

function formatRateLimit(info: RateLimitInfo): string {
  const formatResource = (name: string, data: RateLimitInfo['core']) => {
    const resetIn = Math.max(0, Math.ceil((data.reset.getTime() - Date.now()) / 60000));
    const percentage = ((data.remaining / data.limit) * 100).toFixed(1);
    return `${name}:
  Remaining: ${data.remaining}/${data.limit} (${percentage}%)
  Used: ${data.used}
  Resets in: ${resetIn} minutes`;
  };

  return `GitHub API Rate Limits
${'='.repeat(30)}
${formatResource('REST API (core)', info.core)}

${formatResource('GraphQL API', info.graphql)}
`;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const info = checkRateLimit();
    console.info(formatRateLimit(info));

    if (!canMakeRequests(info, 10)) {
      console.warn('\n⚠️  Low on API requests. Consider waiting before bulk operations.');
      const waitMs = getWaitTime(info);
      if (waitMs > 0) {
        console.warn(`   Rate limit resets in ${Math.ceil(waitMs / 60000)} minutes`);
      }
    }
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
