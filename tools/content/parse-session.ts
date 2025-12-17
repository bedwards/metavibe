/**
 * Session Log Parser
 *
 * Parses Claude Code session logs (JSONL format) and extracts
 * structured data for content generation.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import type {
  SessionLogEntry,
  ParsedSession,
  SessionMessage,
  ToolCall,
  ContentBlock,
} from './session-types.js';

export function parseSessionFile(filePath: string): ParsedSession | null {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const entries: SessionLogEntry[] = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as SessionLogEntry;
      entries.push(entry);
    } catch {
      // Skip malformed lines
    }
  }

  if (entries.length === 0) {
    return null;
  }

  const messages: SessionMessage[] = [];
  const toolsUsed = new Set<string>();
  const filesModified = new Set<string>();
  let summary: string | undefined;
  let project = '';
  let gitBranch: string | undefined;

  for (const entry of entries) {
    if (entry.cwd && !project) {
      project = entry.cwd;
    }
    if (entry.gitBranch && !gitBranch) {
      gitBranch = entry.gitBranch;
    }

    // Extract compact summary if present
    if (entry.isCompactSummary && entry.message?.content) {
      const content = entry.message.content;
      if (typeof content === 'string') {
        summary = content;
      } else if (Array.isArray(content)) {
        const textBlock = content.find(
          (b): b is ContentBlock & { type: 'text'; text: string } =>
            b.type === 'text' && typeof b.text === 'string'
        );
        if (textBlock) {
          summary = textBlock.text;
        }
      }
    }

    // Skip non-message entries
    if (entry.type !== 'user' && entry.type !== 'assistant') {
      continue;
    }
    if (!entry.message?.content) {
      continue;
    }

    const messageContent = entry.message.content;
    const toolCalls: ToolCall[] = [];
    let textContent = '';

    if (typeof messageContent === 'string') {
      textContent = messageContent;
    } else if (Array.isArray(messageContent)) {
      for (const block of messageContent) {
        if (block.type === 'text' && block.text) {
          textContent += block.text + '\n';
        } else if (block.type === 'tool_use' && block.name) {
          toolsUsed.add(block.name);
          toolCalls.push({
            name: block.name,
            input: block.input ?? {},
          });

          // Track file modifications
          if (block.name === 'Edit' || block.name === 'Write') {
            const input = block.input as { file_path?: string } | undefined;
            if (input?.file_path) {
              filesModified.add(input.file_path);
            }
          }
        }
      }
    }

    if (textContent.trim() || toolCalls.length > 0) {
      const role = entry.type === 'user' ? 'user' : 'assistant';
      messages.push({
        role,
        content: textContent.trim(),
        timestamp: new Date(entry.timestamp),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
    }
  }

  if (messages.length === 0) {
    return null;
  }

  const timestamps = messages.map((m) => m.timestamp.getTime());
  const sessionId =
    entries.find((e) => e.sessionId)?.sessionId ?? basename(filePath, '.jsonl');

  // Extract topics from conversation
  const topics = extractTopics(messages, summary);

  return {
    sessionId,
    project,
    gitBranch,
    startTime: new Date(Math.min(...timestamps)),
    endTime: new Date(Math.max(...timestamps)),
    messages,
    summary,
    topics,
    filesModified: [...filesModified],
    toolsUsed: [...toolsUsed],
  };
}

function extractTopics(
  messages: SessionMessage[],
  summary?: string
): string[] {
  const topics = new Set<string>();
  const text = messages.map((m) => m.content).join(' ') + (summary ?? '');

  // Common programming/development topics to detect
  const topicPatterns: [RegExp, string][] = [
    [/\b(react|vue|angular|svelte)\b/i, 'frontend'],
    [/\b(express|fastify|hono|koa)\b/i, 'backend'],
    [/\b(postgres|mysql|sqlite|mongodb|redis)\b/i, 'database'],
    [/\b(docker|kubernetes|k8s)\b/i, 'containerization'],
    [/\b(ci\/cd|github actions|workflow)\b/i, 'ci-cd'],
    [/\b(auth|login|jwt|oauth|session)\b/i, 'authentication'],
    [/\b(test|vitest|jest|playwright|e2e)\b/i, 'testing'],
    [/\b(api|rest|graphql|endpoint)\b/i, 'api-development'],
    [/\b(stripe|payment|checkout)\b/i, 'payments'],
    [/\b(deploy|vercel|cloudflare|aws)\b/i, 'deployment'],
    [/\b(typescript|type|interface)\b/i, 'typescript'],
    [/\b(lint|eslint|prettier)\b/i, 'code-quality'],
    [/\b(git|branch|commit|merge|pr)\b/i, 'version-control'],
    [/\b(refactor|clean|optimize)\b/i, 'refactoring'],
    [/\b(bug|fix|error|debug)\b/i, 'debugging'],
    [/\b(feature|implement|add|create)\b/i, 'feature-development'],
    [/\b(mobile|ios|android|react native|expo)\b/i, 'mobile'],
    [/\b(websocket|realtime|socket)\b/i, 'realtime'],
    [/\b(cache|caching|redis)\b/i, 'caching'],
    [/\b(migration|schema|seed)\b/i, 'database-migrations'],
  ];

  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(text)) {
      topics.add(topic);
    }
  }

  return [...topics];
}

export function findRecentSessions(
  projectsDir: string,
  maxAgeMs = 24 * 60 * 60 * 1000
): string[] {
  const sessions: string[] = [];
  const now = Date.now();

  try {
    const projectDirs = readdirSync(projectsDir);

    for (const projectDir of projectDirs) {
      const projectPath = join(projectsDir, projectDir);
      const stat = statSync(projectPath);

      if (!stat.isDirectory()) {
        continue;
      }

      const files = readdirSync(projectPath);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) {
          continue;
        }

        const filePath = join(projectPath, file);
        const fileStat = statSync(filePath);

        if (now - fileStat.mtimeMs < maxAgeMs) {
          sessions.push(filePath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return sessions.sort((a, b) => {
    const aStat = statSync(a);
    const bStat = statSync(b);
    return bStat.mtimeMs - aStat.mtimeMs;
  });
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes('--recent')) {
    const projectsDir = `${process.env.HOME ?? ''}/.claude/projects`;
    const sessions = findRecentSessions(projectsDir);
    console.info(`Found ${sessions.length} recent sessions:`);
    for (const session of sessions.slice(0, 10)) {
      console.info(`  ${session}`);
    }
  } else if (args.length > 0) {
    const session = parseSessionFile(args[0]);
    if (session) {
      console.info(JSON.stringify(session, null, 2));
    } else {
      console.error('Failed to parse session');
    }
  } else {
    console.info('Usage:');
    console.info('  npx tsx tools/content/parse-session.ts <session.jsonl>');
    console.info('  npx tsx tools/content/parse-session.ts --recent');
  }
}
