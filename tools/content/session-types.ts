/**
 * Types for Claude Code session log parsing
 */

export interface SessionLogEntry {
  type: 'user' | 'assistant' | 'file-history-snapshot';
  parentUuid: string | null;
  uuid: string;
  timestamp: string;
  sessionId: string;
  cwd: string;
  gitBranch?: string;
  agentId?: string;
  message?: {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  };
  isCompactSummary?: boolean;
  isSidechain?: boolean;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface ParsedSession {
  sessionId: string;
  project: string;
  gitBranch?: string;
  startTime: Date;
  endTime: Date;
  messages: SessionMessage[];
  summary?: string;
  topics: string[];
  filesModified: string[];
  toolsUsed: string[];
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface GeneratedContent {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  summary: string;
  body: string;
  sourceSession: string;
  generatedAt: Date;
}

export interface WatcherConfig {
  claudeDir: string;
  projectsDir: string;
  outputDir: string;
  debounceMs: number;
}

export const DEFAULT_WATCHER_CONFIG: WatcherConfig = {
  claudeDir: `${process.env.HOME}/.claude`,
  projectsDir: `${process.env.HOME}/.claude/projects`,
  outputDir: './content/generated',
  debounceMs: 5000,
};
