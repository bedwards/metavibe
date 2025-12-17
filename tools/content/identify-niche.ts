/**
 * Niche Identification
 *
 * Analyzes a coding session AND the associated repo to identify
 * a publishable niche. The goal is to find the sweet spot:
 *
 * Too general: "Enterprise Software"
 * Too specific: "My Substack Magazine About Politics"
 * Just right: "Adventure Game in Roblox"
 *
 * Formula: [Platform/Stack] + [Type of Application]
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ParsedSession } from './session-types.js';

export interface Niche {
  platform: string;        // e.g., "Roblox", "React Native", "Discord"
  appType: string;         // e.g., "Adventure Game", "Fitness Tracker", "Bot"
  title: string;           // e.g., "How to Vibe Code an Adventure Game in Roblox"
  confidence: number;      // 0-1, how confident we are in this niche
  signals: string[];       // What we found that led to this conclusion
}

// Platform detection patterns
const PLATFORM_PATTERNS: [RegExp, string, string[]][] = [
  // [pattern to match in files/deps, platform name, file patterns to check]
  [/roblox|rbxl|luau/i, 'Roblox', ['*.lua', '*.luau', 'default.project.json']],
  [/react-native|expo/i, 'React Native', ['app.json', 'metro.config.js']],
  [/discord\.js|discord-api/i, 'Discord', ['package.json']],
  [/electron/i, 'Electron', ['package.json', 'electron.js']],
  [/unity|\.unity|UnityEngine/i, 'Unity', ['*.cs', 'ProjectSettings/']],
  [/godot|\.gd$/i, 'Godot', ['*.gd', 'project.godot']],
  [/flutter|dart/i, 'Flutter', ['pubspec.yaml', '*.dart']],
  [/next\.js|nextjs/i, 'Next.js', ['next.config.js', 'pages/', 'app/']],
  [/vue/i, 'Vue.js', ['vue.config.js', '*.vue']],
  [/svelte/i, 'SvelteKit', ['svelte.config.js', '*.svelte']],
  [/fastapi|django|flask/i, 'Python Web', ['requirements.txt', '*.py']],
  [/rails/i, 'Ruby on Rails', ['Gemfile', 'config/routes.rb']],
  [/shopify|liquid/i, 'Shopify', ['*.liquid', 'shopify.theme.toml']],
  [/wordpress|wp-/i, 'WordPress', ['wp-config.php', 'functions.php']],
  [/supabase/i, 'Supabase', ['supabase/', '.supabase/']],
  [/firebase/i, 'Firebase', ['firebase.json', '.firebaserc']],
  [/aws-cdk|cloudformation/i, 'AWS', ['cdk.json', 'template.yaml']],
  [/terraform/i, 'Terraform', ['*.tf', 'main.tf']],
  [/kubernetes|k8s|helm/i, 'Kubernetes', ['*.yaml', 'Chart.yaml']],
];

// App type detection based on keywords and file patterns
const APP_TYPE_PATTERNS: [RegExp, string][] = [
  // Games
  [/game|player|score|level|spawn|enemy|health|inventory/i, 'Game'],
  [/adventure|quest|rpg|dungeon|character/i, 'Adventure Game'],
  [/platformer|jump|collision|physics/i, 'Platformer Game'],
  [/puzzle|match|tile|grid/i, 'Puzzle Game'],
  [/multiplayer|lobby|matchmaking/i, 'Multiplayer Game'],

  // Business/Enterprise
  [/patient|hipaa|ehr|medical|healthcare|clinic/i, 'Healthcare Application'],
  [/invoice|billing|subscription|payment|stripe/i, 'Billing System'],
  [/crm|customer|lead|sales|pipeline/i, 'CRM'],
  [/inventory|warehouse|shipping|fulfillment/i, 'Inventory System'],
  [/booking|appointment|calendar|schedule/i, 'Booking System'],
  [/hr|employee|payroll|timesheet/i, 'HR System'],

  // Social/Community
  [/chat|message|conversation|dm/i, 'Chat Application'],
  [/forum|thread|post|comment|discussion/i, 'Forum'],
  [/social|feed|follow|like|share/i, 'Social Platform'],
  [/community|member|moderation|ban/i, 'Community Platform'],
  [/bot|command|slash|webhook/i, 'Bot'],

  // Content/Media
  [/blog|article|cms|content/i, 'Content Management System'],
  [/video|stream|player|media/i, 'Media Platform'],
  [/podcast|audio|episode/i, 'Podcast Platform'],
  [/newsletter|email|subscriber/i, 'Newsletter System'],
  [/magazine|publication|editorial/i, 'Publishing Platform'],

  // E-commerce
  [/shop|cart|checkout|product|catalog/i, 'E-commerce Store'],
  [/marketplace|seller|buyer|listing/i, 'Marketplace'],

  // Developer Tools
  [/cli|command.line|terminal|shell/i, 'CLI Tool'],
  [/api|endpoint|rest|graphql/i, 'API Service'],
  [/sdk|library|package|module/i, 'SDK/Library'],
  [/dashboard|analytics|metrics|monitoring/i, 'Analytics Dashboard'],
  [/deploy|ci|cd|pipeline|workflow/i, 'DevOps Tool'],

  // Mobile Specific
  [/fitness|workout|exercise|health/i, 'Fitness App'],
  [/tracker|habit|goal|progress/i, 'Tracking App'],
  [/camera|photo|image|gallery/i, 'Photo App'],
  [/map|location|gps|navigation/i, 'Location App'],
  [/todo|task|reminder|note/i, 'Productivity App'],
];

export function identifyNiche(
  session: ParsedSession,
  repoPath?: string
): Niche {
  const signals: string[] = [];
  let platform = 'TypeScript'; // Default fallback
  let appType = 'Application';
  let platformConfidence = 0;
  let appTypeConfidence = 0;

  // Gather all text to analyze
  const textSources: string[] = [
    ...session.messages.map((m) => m.content),
    session.summary ?? '',
    ...session.filesModified,
    ...session.topics,
  ];
  const allText = textSources.join(' ');

  // Try to read repo files for more context
  const repoText = repoPath ? readRepoContext(repoPath) : '';
  const combinedText = allText + ' ' + repoText;

  // Detect platform
  for (const [pattern, platformName, _filePatterns] of PLATFORM_PATTERNS) {
    if (pattern.test(combinedText)) {
      platform = platformName;
      platformConfidence = 0.8;
      signals.push(`Platform detected: ${platformName} (pattern match)`);
      break;
    }
  }

  // Detect app type
  for (const [pattern, typeName] of APP_TYPE_PATTERNS) {
    const matches = combinedText.match(pattern);
    if (matches && matches.length > 0) {
      // More matches = higher confidence
      const matchCount = (combinedText.match(new RegExp(pattern, 'gi')) ?? []).length;
      if (matchCount > 2) {
        appType = typeName;
        appTypeConfidence = Math.min(0.9, 0.5 + matchCount * 0.1);
        signals.push(`App type detected: ${typeName} (${matchCount} matches)`);
        break;
      }
    }
  }

  // Construct title
  const article = startsWithVowel(appType) ? 'an' : 'a';
  let title: string;

  if (platform === 'TypeScript' && appType === 'Application') {
    // Couldn't identify specifics, use topics
    const topTopic = session.topics[0];
    if (topTopic) {
      title = `How to Vibe Code ${capitalizeWords(topTopic.replace(/-/g, ' '))}`;
    } else {
      title = 'How to Vibe Code This Project';
    }
    signals.push('Fell back to generic title from topics');
  } else if (platform === 'TypeScript') {
    title = `How to Vibe Code ${article} ${appType}`;
  } else {
    title = `How to Vibe Code ${article} ${appType} in ${platform}`;
  }

  const confidence = (platformConfidence + appTypeConfidence) / 2;

  return {
    platform,
    appType,
    title,
    confidence,
    signals,
  };
}

function readRepoContext(repoPath: string): string {
  const contextParts: string[] = [];

  // Read package.json for dependencies
  const packageJsonPath = join(repoPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = readFileSync(packageJsonPath, 'utf-8');
      contextParts.push(pkg);
    } catch {
      // Ignore read errors
    }
  }

  // Read README for description
  const readmePaths = ['README.md', 'readme.md', 'Readme.md'];
  for (const readmeName of readmePaths) {
    const readmePath = join(repoPath, readmeName);
    if (existsSync(readmePath)) {
      try {
        const readme = readFileSync(readmePath, 'utf-8');
        // Only take first 2000 chars to avoid noise
        contextParts.push(readme.slice(0, 2000));
      } catch {
        // Ignore read errors
      }
      break;
    }
  }

  // Read any project-specific config files
  const configFiles = [
    'app.json',           // React Native/Expo
    'game.project',       // Defold
    'project.godot',      // Godot
    'Cargo.toml',         // Rust
    'pubspec.yaml',       // Flutter
    'pyproject.toml',     // Python
  ];

  for (const configFile of configFiles) {
    const configPath = join(repoPath, configFile);
    if (existsSync(configPath)) {
      try {
        const config = readFileSync(configPath, 'utf-8');
        contextParts.push(config.slice(0, 1000));
      } catch {
        // Ignore read errors
      }
    }
  }

  return contextParts.join('\n');
}

function startsWithVowel(str: string): boolean {
  return /^[aeiou]/i.test(str);
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.info('Usage:');
    console.info('  npx tsx tools/content/identify-niche.ts <session.jsonl> [repo-path]');
    process.exit(1);
  }

  const { parseSessionFile } = await import('./parse-session.js');
  const session = parseSessionFile(args[0]);

  if (!session) {
    console.error('Failed to parse session');
    process.exit(1);
  }

  const repoPath = args[1] ?? session.project;
  const niche = identifyNiche(session, repoPath);

  console.info('Identified Niche:');
  console.info(`  Title: ${niche.title}`);
  console.info(`  Platform: ${niche.platform}`);
  console.info(`  App Type: ${niche.appType}`);
  console.info(`  Confidence: ${(niche.confidence * 100).toFixed(0)}%`);
  console.info('  Signals:');
  for (const signal of niche.signals) {
    console.info(`    - ${signal}`);
  }
}
