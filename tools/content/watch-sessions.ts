/**
 * Session Log Watcher
 *
 * Watches Claude Code session backup logs for changes and triggers
 * content generation when sessions are updated.
 *
 * Uses native fs.watch with debouncing to efficiently monitor the
 * ~/.claude/projects directory tree.
 */

import { watch, existsSync, statSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { parseSessionFile } from './parse-session.js';
import { generateContent, saveContent } from './generate-content.js';
import { DEFAULT_WATCHER_CONFIG, type WatcherConfig } from './session-types.js';

interface WatchState {
  lastProcessed: Map<string, number>;
  debounceTimers: Map<string, NodeJS.Timeout>;
  watchers: Map<string, ReturnType<typeof watch>>;
}

const state: WatchState = {
  lastProcessed: new Map(),
  debounceTimers: new Map(),
  watchers: new Map(),
};

function shouldProcess(filePath: string, _config: WatcherConfig): boolean {
  if (!filePath.endsWith('.jsonl')) {
    return false;
  }

  // Skip agent sidechains (usually warmup/internal)
  if (basename(filePath).startsWith('agent-')) {
    return false;
  }

  try {
    const stat = statSync(filePath);
    const lastTime = state.lastProcessed.get(filePath) ?? 0;

    // Only process if modified since last processing
    if (stat.mtimeMs <= lastTime) {
      return false;
    }

    // Only process files with substantial content
    if (stat.size < 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function processSession(filePath: string, config: WatcherConfig): void {
  console.info(`[${new Date().toISOString()}] Processing: ${filePath}`);

  try {
    const session = parseSessionFile(filePath);

    if (!session) {
      console.info(`  Skipped: Could not parse session`);
      return;
    }

    if (session.messages.length < 5) {
      console.info(`  Skipped: Too few messages (${session.messages.length})`);
      return;
    }

    if (session.topics.length === 0) {
      console.info(`  Skipped: No detectable topics`);
      return;
    }

    const content = generateContent(session);
    const savedPath = saveContent(content, config.outputDir);

    console.info(`  Generated: ${savedPath}`);
    console.info(`  Title: ${content.title}`);
    console.info(`  Topics: ${content.tags.join(', ')}`);

    state.lastProcessed.set(filePath, Date.now());
  } catch (err) {
    console.error(`  Error processing session:`, err);
  }
}

function scheduleProcessing(
  filePath: string,
  config: WatcherConfig
): void {
  // Clear existing timer for this file
  const existingTimer = state.debounceTimers.get(filePath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule new processing
  const timer = setTimeout(() => {
    state.debounceTimers.delete(filePath);

    if (shouldProcess(filePath, config)) {
      processSession(filePath, config);
    }
  }, config.debounceMs);

  state.debounceTimers.set(filePath, timer);
}

function watchProjectDir(
  projectPath: string,
  config: WatcherConfig
): void {
  if (state.watchers.has(projectPath)) {
    return;
  }

  try {
    const watcher = watch(projectPath, (_eventType, filename) => {
      if (!filename || !filename.endsWith('.jsonl')) {
        return;
      }

      const filePath = join(projectPath, filename);
      scheduleProcessing(filePath, config);
    });

    state.watchers.set(projectPath, watcher);
    console.info(`  Watching: ${projectPath}`);
  } catch (err) {
    console.error(`  Failed to watch ${projectPath}:`, err);
  }
}

function discoverAndWatchProjects(config: WatcherConfig): void {
  if (!existsSync(config.projectsDir)) {
    console.error(`Projects directory not found: ${config.projectsDir}`);
    return;
  }

  const entries = readdirSync(config.projectsDir);

  for (const entry of entries) {
    const projectPath = join(config.projectsDir, entry);

    try {
      const stat = statSync(projectPath);
      if (stat.isDirectory()) {
        watchProjectDir(projectPath, config);
      }
    } catch {
      // Skip inaccessible directories
    }
  }
}

function watchForNewProjects(config: WatcherConfig): void {
  try {
    watch(config.projectsDir, (_eventType, filename) => {
      if (!filename) {
        return;
      }

      const projectPath = join(config.projectsDir, filename);

      try {
        const stat = statSync(projectPath);
        if (stat.isDirectory() && !state.watchers.has(projectPath)) {
          watchProjectDir(projectPath, config);
        }
      } catch {
        // Directory doesn't exist or can't be accessed
      }
    });

    console.info(`Watching for new projects in: ${config.projectsDir}`);
  } catch (err) {
    console.error(`Failed to watch projects directory:`, err);
  }
}

export function startWatcher(
  customConfig?: Partial<WatcherConfig>
): () => void {
  const config = { ...DEFAULT_WATCHER_CONFIG, ...customConfig };

  console.info('Starting Claude Code session watcher...');
  console.info(`  Claude directory: ${config.claudeDir}`);
  console.info(`  Output directory: ${config.outputDir}`);
  console.info(`  Debounce: ${config.debounceMs}ms`);
  console.info('');

  // Initial discovery of project directories
  discoverAndWatchProjects(config);

  // Watch for new projects being added
  watchForNewProjects(config);

  console.info('');
  console.info('Watcher started. Press Ctrl+C to stop.');
  console.info('');

  // Return cleanup function
  return () => {
    console.info('\nStopping watcher...');

    for (const timer of state.debounceTimers.values()) {
      clearTimeout(timer);
    }

    for (const watcher of state.watchers.values()) {
      watcher.close();
    }

    state.debounceTimers.clear();
    state.watchers.clear();
    state.lastProcessed.clear();

    console.info('Watcher stopped.');
  };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const outputDir =
    args.find((a) => a.startsWith('--output='))?.split('=')[1] ??
    DEFAULT_WATCHER_CONFIG.outputDir;

  const debounceMs = parseInt(
    args.find((a) => a.startsWith('--debounce='))?.split('=')[1] ?? '5000',
    10
  );

  const cleanup = startWatcher({ outputDir, debounceMs });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}
