#!/usr/bin/env npx tsx
/**
 * Initialize a new project from claude-base
 *
 * Usage:
 *   cd /path/to/your/new/project
 *   /path/to/claude-base/bin/init.ts
 *
 *   # Or with options:
 *   /path/to/claude-base/bin/init.ts --name my-project --no-substack
 *
 * Options:
 *   --name <name>     Project name (default: directory name)
 *   --no-substack     Exclude content/substack directory
 *   --no-git          Don't initialize git repo
 *   --force           Overwrite existing files
 */

import { execSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  copyFileSync
} from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLAUDE_BASE_ROOT = dirname(__dirname);

interface InitOptions {
  name: string;
  targetDir: string;
  includeSubstack: boolean;
  initGit: boolean;
  force: boolean;
}

const EXCLUDE_PATTERNS = [
  '.git',
  'node_modules',
  '.env',
  '.secrets',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'screenshots/current',
  'screenshots/baseline',
  'screenshots/diff',
  'claude-progress.txt',
  '.gh-hosts.yml',
];

const EXCLUDE_IF_NO_SUBSTACK = [
  'content/substack',
];

function parseArgs(): InitOptions {
  const args = process.argv.slice(2);
  const targetDir = process.cwd();

  const options: InitOptions = {
    name: basename(targetDir),
    targetDir,
    includeSubstack: true,
    initGit: true,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--name':
        options.name = args[++i];
        break;
      case '--no-substack':
        options.includeSubstack = false;
        break;
      case '--no-git':
        options.initGit = false;
        break;
      case '--force':
        options.force = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.info(`
claude-base init - Initialize a new project from claude-base foundation

Usage:
  cd /path/to/your/new/project
  /path/to/claude-base/bin/init.ts [options]

Options:
  --name <name>     Project name for package.json (default: directory name)
  --no-substack     Exclude content/substack directory
  --no-git          Don't initialize git repository
  --force           Overwrite existing files without prompting
  --help, -h        Show this help message

Example:
  mkdir my-new-app && cd my-new-app
  ~/claude-base/bin/init.ts --name my-new-app
`);
}

function shouldExclude(relativePath: string, options: InitOptions): boolean {
  for (const pattern of EXCLUDE_PATTERNS) {
    if (relativePath === pattern || relativePath.startsWith(pattern + '/')) {
      return true;
    }
  }

  if (!options.includeSubstack) {
    for (const pattern of EXCLUDE_IF_NO_SUBSTACK) {
      if (relativePath === pattern || relativePath.startsWith(pattern + '/')) {
        return true;
      }
    }
  }

  return false;
}

function copyDir(src: string, dest: string, options: InitOptions, baseDir: string = src): void {
  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const relativePath = srcPath.slice(baseDir.length + 1);

    if (shouldExclude(relativePath, options)) {
      continue;
    }

    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath, options, baseDir);
    } else {
      if (existsSync(destPath) && !options.force) {
        console.warn(`  Skipping (exists): ${relativePath}`);
        continue;
      }
      copyFileSync(srcPath, destPath);
      console.info(`  Copied: ${relativePath}`);
    }
  }
}

function updatePackageJson(targetDir: string, name: string): void {
  const pkgPath = join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) {return;}

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
  pkg.name = name;
  pkg.version = '0.1.0';
  pkg.description = `${name} - built on claude-base`;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.info(`  Updated package.json name to: ${name}`);
}

function updateDiscordConfig(targetDir: string, name: string): void {
  const configPath = join(targetDir, 'discord.config.json');
  if (!existsSync(configPath)) {return;}

  const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
  config.projectName = name;

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.info(`  Updated discord.config.json projectName to: ${name}`);
}

function initGit(targetDir: string): void {
  try {
    execSync('git init', { cwd: targetDir, stdio: 'pipe' });
    console.info('  Initialized git repository');
  } catch {
    console.warn('  Warning: Failed to initialize git repository');
  }
}

function makeHooksExecutable(targetDir: string): void {
  const huskyDir = join(targetDir, '.husky');
  if (!existsSync(huskyDir)) {return;}

  try {
    const hooks = readdirSync(huskyDir).filter(f => !f.startsWith('.'));
    for (const hook of hooks) {
      execSync(`chmod +x "${join(huskyDir, hook)}"`, { stdio: 'pipe' });
    }
    console.info('  Made git hooks executable');
  } catch {
    console.warn('  Warning: Failed to set hook permissions');
  }
}

function main(): void {
  const options = parseArgs();

  console.info(`\nInitializing new project: ${options.name}`);
  console.info(`Target directory: ${options.targetDir}`);
  console.info(`Source: ${CLAUDE_BASE_ROOT}\n`);

  // Check if target has files
  const existingFiles = readdirSync(options.targetDir).filter(f => !f.startsWith('.'));
  if (existingFiles.length > 0 && !options.force) {
    console.info('Target directory is not empty. Files present:');
    existingFiles.slice(0, 5).forEach(f => console.info(`  - ${f}`));
    if (existingFiles.length > 5) {
      console.info(`  ... and ${existingFiles.length - 5} more`);
    }
    console.info('\nUse --force to overwrite existing files.');
    console.info('Proceeding will only add/update files, not delete existing ones.\n');
  }

  // Copy files
  console.info('Copying files...');
  copyDir(CLAUDE_BASE_ROOT, options.targetDir, options);

  // Update project-specific files
  console.info('\nCustomizing for project...');
  updatePackageJson(options.targetDir, options.name);
  updateDiscordConfig(options.targetDir, options.name);

  // Initialize git if requested
  if (options.initGit && !existsSync(join(options.targetDir, '.git'))) {
    console.info('\nSetting up git...');
    initGit(options.targetDir);
  }

  // Make hooks executable
  makeHooksExecutable(options.targetDir);

  console.info(`
Done! Next steps:

  cd ${options.targetDir}
  npm install
  cp .env.example .env
  cp .secrets.example .secrets
  # Edit .env and .secrets with your values
  npm run db:up
  npm run dev

Read CLAUDE.md for Claude instance instructions.
`);
}

main();
