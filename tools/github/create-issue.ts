/**
 * GitHub Issue Creator
 *
 * Creates GitHub issues with rate limit awareness.
 * Uses gh CLI which requires authentication via `gh auth login`.
 *
 * IMPORTANT: Do not modify global gh config. Multiple Claude instances
 * may be running on the same machine. Use local config via environment.
 *
 * From Anthropic Engineering Blog - "How we built our multi-agent research system":
 * "Statefulness compounds errors - Minor failures cascade unpredictably;
 * implement resumable checkpoints"
 *
 * Usage:
 *   npm run gh:issue -- --title "Bug: Login fails" --body "Description here"
 *   npm run gh:issue -- --title "Feature: Dark mode" --labels "enhancement,ui"
 *   npm run gh:issue -- --title "Task" --assignee "@me"
 */

import { execSync } from 'child_process';
import { checkRateLimit, canMakeRequests, getWaitTime } from './check-rate-limit.js';

interface IssueOptions {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;
  project?: string;
}

interface CreatedIssue {
  number: number;
  url: string;
  title: string;
}

const STANDARD_LABELS = [
  'bug',
  'enhancement',
  'documentation',
  'good first issue',
  'help wanted',
  'priority:high',
  'priority:medium',
  'priority:low',
  'blocked',
  'in-progress',
  'needs-review',
  'wontfix',
];

export function createIssue(options: IssueOptions): CreatedIssue {
  // Check rate limits first
  const rateLimit = checkRateLimit();

  if (!canMakeRequests(rateLimit, 5)) {
    const waitMs = getWaitTime(rateLimit);
    throw new Error(
      `Rate limit too low. Wait ${Math.ceil(waitMs / 60000)} minutes before creating issues.`
    );
  }

  const args: string[] = ['gh', 'issue', 'create'];

  args.push('--title', `"${options.title.replace(/"/g, '\\"')}"`);

  if (options.body) {
    args.push('--body', `"${options.body.replace(/"/g, '\\"')}"`);
  }

  if (options.labels?.length) {
    args.push('--label', options.labels.join(','));
  }

  if (options.assignees?.length) {
    args.push('--assignee', options.assignees.join(','));
  }

  if (options.milestone) {
    args.push('--milestone', options.milestone);
  }

  if (options.project) {
    args.push('--project', options.project);
  }

  try {
    const result = execSync(args.join(' '), {
      encoding: 'utf-8',
      env: { ...process.env },
      shell: '/bin/sh',
    });

    // gh issue create returns the URL of the created issue
    const url = result.trim();
    const match = url.match(/\/issues\/(\d+)$/);
    const number = match ? parseInt(match[1], 10) : 0;

    return {
      number,
      url,
      title: options.title,
    };
  } catch (err) {
    throw new Error(
      `Failed to create issue. Ensure gh CLI is authenticated and has repo access.\n${err}`
    );
  }
}

export function assignIssue(issueNumber: number, assignee: string): void {
  const rateLimit = checkRateLimit();

  if (!canMakeRequests(rateLimit, 2)) {
    throw new Error('Rate limit too low for assignment.');
  }

  try {
    execSync(`gh issue edit ${issueNumber} --add-assignee ${assignee}`, {
      encoding: 'utf-8',
      env: { ...process.env },
    });
  } catch (err) {
    throw new Error(`Failed to assign issue #${issueNumber}: ${err}`);
  }
}

export function markInProgress(issueNumber: number): void {
  const rateLimit = checkRateLimit();

  if (!canMakeRequests(rateLimit, 2)) {
    throw new Error('Rate limit too low for labeling.');
  }

  try {
    // Remove blocked if present, add in-progress
    execSync(
      `gh issue edit ${issueNumber} --remove-label "blocked" --add-label "in-progress" 2>/dev/null || gh issue edit ${issueNumber} --add-label "in-progress"`,
      {
        encoding: 'utf-8',
        env: { ...process.env },
        shell: '/bin/sh',
      }
    );
  } catch (err) {
    throw new Error(`Failed to mark issue #${issueNumber} in-progress: ${err}`);
  }
}

export function getStandardLabels(): string[] {
  return [...STANDARD_LABELS];
}

function parseArgs(): IssueOptions {
  const args = process.argv.slice(2);
  const options: Partial<IssueOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--title':
      case '-t':
        options.title = value;
        i++;
        break;
      case '--body':
      case '-b':
        options.body = value;
        i++;
        break;
      case '--labels':
      case '-l':
        options.labels = value.split(',').map(l => l.trim());
        i++;
        break;
      case '--assignee':
      case '-a':
        options.assignees = value.split(',').map(a => a.trim());
        i++;
        break;
      case '--milestone':
      case '-m':
        options.milestone = value;
        i++;
        break;
      case '--project':
      case '-p':
        options.project = value;
        i++;
        break;
    }
  }

  if (!options.title) {
    console.error('Usage: npm run gh:issue -- --title <title> [options]');
    console.error('Options:');
    console.error('  --body <text>          Issue body/description');
    console.error('  --labels <l1,l2>       Comma-separated labels');
    console.error('  --assignee <user>      Assignee (@me for self)');
    console.error('  --milestone <name>     Milestone name');
    console.error('  --project <name>       Project name');
    console.error('\nStandard labels:', STANDARD_LABELS.join(', '));
    process.exit(1);
  }

  return options as IssueOptions;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  try {
    const issue = createIssue(options);
    console.info(`Created issue #${issue.number}`);
    console.info(`URL: ${issue.url}`);
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
