/**
 * Content Generator
 *
 * Takes parsed Claude Code sessions and generates how-to essays
 * on slightly generalized topics. The key insight is that specific
 * coding sessions often teach broadly applicable patterns.
 *
 * Example: A session about "adding Stripe to my SaaS" becomes
 * "How to Integrate Stripe Payments in a TypeScript Application"
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { ParsedSession, GeneratedContent } from './session-types.js';
import { parseSessionFile, findRecentSessions } from './parse-session.js';
import { identifyNiche, type Niche } from './identify-niche.js';

// Topic generalizations - maps specific to general
const TOPIC_GENERALIZATIONS: Record<string, string> = {
  'react': 'React Applications',
  'vue': 'Vue.js Applications',
  'express': 'Node.js Backend Services',
  'postgres': 'PostgreSQL Databases',
  'mongodb': 'MongoDB Applications',
  'docker': 'Containerized Applications',
  'kubernetes': 'Kubernetes Deployments',
  'github-actions': 'CI/CD Pipelines',
  'authentication': 'User Authentication Systems',
  'testing': 'Test-Driven Development',
  'api-development': 'RESTful APIs',
  'payments': 'Payment Processing',
  'deployment': 'Production Deployments',
  'typescript': 'TypeScript Projects',
  'mobile': 'Mobile Applications',
  'realtime': 'Real-time Features',
  'database-migrations': 'Database Schema Management',
};

// Content templates for different article types (reserved for future use)
// const ARTICLE_TEMPLATES = {
//   'how-to': { prefix: 'How to', structure: ['introduction', 'prerequisites', 'steps', 'conclusion'] },
//   'guide': { prefix: 'A Complete Guide to', structure: ['overview', 'concepts', 'implementation', 'best-practices'] },
//   'tutorial': { prefix: 'Building', structure: ['goals', 'setup', 'implementation', 'testing', 'deployment'] },
// };

export function generateTitle(session: ParsedSession): string {
  const topics = session.topics;

  if (topics.length === 0) {
    return `Vibe Coding Session: ${session.project.split('/').pop() ?? 'Project'}`;
  }

  const primaryTopic = topics[0];
  const generalTopic =
    TOPIC_GENERALIZATIONS[primaryTopic] ?? capitalizeFirst(primaryTopic);

  // Pick article type based on content
  const hasMultipleSteps = session.toolsUsed.includes('Edit');
  const isSetup = topics.includes('deployment') || topics.includes('ci-cd');

  if (isSetup) {
    return `Setting Up ${generalTopic}`;
  } else if (hasMultipleSteps) {
    return `How to Build ${generalTopic} with Vibe Coding`;
  } else {
    return `Working with ${generalTopic}`;
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function categorizeSession(session: ParsedSession): string {
  const topics = session.topics;

  if (topics.includes('deployment') || topics.includes('ci-cd')) {
    return 'devops';
  }
  if (topics.includes('testing')) {
    return 'testing';
  }
  if (topics.includes('frontend') || topics.includes('mobile')) {
    return 'frontend';
  }
  if (topics.includes('backend') || topics.includes('api-development')) {
    return 'backend';
  }
  if (topics.includes('database') || topics.includes('database-migrations')) {
    return 'database';
  }

  return 'general';
}

export function generateBodyWithNiche(session: ParsedSession, niche: Niche): string {
  const sections: string[] = [];

  // Introduction with niche context
  sections.push(`## Introduction\n`);
  sections.push(
    `This guide shows you how to build ${niche.appType.toLowerCase()} applications` +
      `${niche.platform !== 'TypeScript' ? ` using ${niche.platform}` : ''} with vibe coding. ` +
      `Vibe coding is AI-assisted development: you describe what you want, and AI handles the implementation.\n`
  );

  if (niche.platform !== 'TypeScript') {
    sections.push(
      `We'll focus specifically on the ${niche.platform} ecosystem, covering the patterns and practices that work best for ${niche.appType.toLowerCase()} development.\n`
    );
  }

  return generateBodySections(session, sections, niche);
}

export function generateBody(session: ParsedSession): string {
  const sections: string[] = [];

  // Introduction
  sections.push(`## Introduction\n`);
  sections.push(
    `This guide covers ${session.topics.join(', ')} based on real-world vibe coding sessions. ` +
      `Vibe coding is an AI-assisted development approach where you describe what you want and let AI handle the implementation details.\n`
  );

  return generateBodySections(session, sections);
}

function generateBodySections(session: ParsedSession, sections: string[], niche?: Niche): string {

  // What was built
  if (session.filesModified.length > 0) {
    sections.push(`## What We're Building\n`);
    sections.push(
      `In this session, we modified ${session.filesModified.length} files to implement the feature. ` +
        `The key files involved:\n`
    );
    for (const file of session.filesModified.slice(0, 5)) {
      const shortPath = file.split('/').slice(-2).join('/');
      sections.push(`- \`${shortPath}\``);
    }
    sections.push('');
  }

  // Tools and techniques
  if (session.toolsUsed.length > 0) {
    sections.push(`## Tools and Techniques\n`);
    sections.push(`The following tools were used in this vibe coding session:\n`);
    for (const tool of session.toolsUsed) {
      const desc = getToolDescription(tool);
      sections.push(`- **${tool}**: ${desc}`);
    }
    sections.push('');
  }

  // Key insights from the conversation
  sections.push(`## Key Patterns\n`);
  sections.push(
    `When working with ${session.topics[0] ?? 'this technology'}, several patterns emerged:\n`
  );
  sections.push(`1. **Start with the end in mind** - Describe the desired outcome clearly`);
  sections.push(`2. **Iterate quickly** - Make small changes and verify frequently`);
  sections.push(`3. **Trust but verify** - Use screenshots and tests to confirm behavior`);
  sections.push('');

  // Summary if available
  if (session.summary) {
    sections.push(`## Session Summary\n`);
    // Extract just the first paragraph of the summary
    const firstPara = session.summary.split('\n\n')[0];
    if (firstPara && firstPara.length < 1000) {
      sections.push(firstPara);
    }
    sections.push('');
  }

  // Conclusion
  sections.push(`## Conclusion\n`);
  if (niche && niche.confidence > 0.3) {
    sections.push(
      `Vibe coding transforms how we build ${niche.appType.toLowerCase()} applications` +
        `${niche.platform !== 'TypeScript' ? ` in ${niche.platform}` : ''}. ` +
        `By focusing on outcomes rather than syntax, we can ship faster and with fewer errors.\n`
    );
  } else {
    sections.push(
      `Vibe coding transforms how we approach ${session.topics.join(' and ')}. ` +
        `By focusing on outcomes rather than syntax, we can build faster and with fewer errors.\n`
    );
  }
  sections.push(
    `This guide was derived from a real vibe coding session with ` +
      `${session.messages.length} interactions.\n`
  );

  return sections.join('\n');
}

function getToolDescription(tool: string): string {
  const descriptions: Record<string, string> = {
    Read: 'Reading and understanding existing code',
    Edit: 'Making targeted changes to files',
    Write: 'Creating new files',
    Bash: 'Running shell commands',
    Glob: 'Finding files by pattern',
    Grep: 'Searching code content',
    Task: 'Spawning specialized agents for complex tasks',
    WebFetch: 'Fetching documentation and resources',
    WebSearch: 'Searching for solutions online',
  };

  return descriptions[tool] ?? 'Specialized development tool';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateContent(session: ParsedSession): GeneratedContent {
  // Use niche identification for better titles
  const niche = identifyNiche(session, session.project);
  const title = niche.confidence > 0.3 ? niche.title : generateTitle(session);
  const slug = generateSlug(title);
  const category = categorizeSession(session);
  const body = generateBodyWithNiche(session, niche);

  return {
    title,
    slug,
    category,
    tags: [...session.topics, niche.platform.toLowerCase(), niche.appType.toLowerCase().replace(/\s+/g, '-')],
    summary: `A vibe coding guide to building ${niche.appType.toLowerCase()} applications${niche.platform !== 'TypeScript' ? ` with ${niche.platform}` : ''}`,
    body,
    sourceSession: session.sessionId,
    generatedAt: new Date(),
  };
}

export function saveContent(
  content: GeneratedContent,
  outputDir: string
): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${content.slug}.md`;
  const filepath = join(outputDir, filename);

  const frontmatter = [
    '---',
    `title: "${content.title}"`,
    `date: ${content.generatedAt.toISOString().split('T')[0]}`,
    `category: ${content.category}`,
    `tags: [${content.tags.map((t) => `"${t}"`).join(', ')}]`,
    `status: draft`,
    `source_session: ${content.sourceSession}`,
    '---',
    '',
  ].join('\n');

  const fullContent = frontmatter + content.body;
  writeFileSync(filepath, fullContent, 'utf-8');

  return filepath;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const outputDir = args.find((a) => a.startsWith('--output='))?.split('=')[1] ?? './content/generated';

  if (args.includes('--recent')) {
    const projectsDir = `${process.env.HOME ?? ''}/.claude/projects`;
    const sessions = findRecentSessions(projectsDir, 7 * 24 * 60 * 60 * 1000); // Last 7 days

    console.info(`Processing ${sessions.length} recent sessions...`);

    let generated = 0;
    for (const sessionPath of sessions) {
      const session = parseSessionFile(sessionPath);
      if (!session || session.messages.length < 5) {
        continue; // Skip short sessions
      }

      const content = generateContent(session);
      const savedPath = saveContent(content, outputDir);
      console.info(`Generated: ${savedPath}`);
      generated++;

      if (generated >= 10) {
        break; // Limit to 10 articles per run
      }
    }

    console.info(`\nGenerated ${generated} articles in ${outputDir}`);
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    const session = parseSessionFile(args[0]);
    if (session) {
      const content = generateContent(session);
      const savedPath = saveContent(content, outputDir);
      console.info(`Generated: ${savedPath}`);
    } else {
      console.error('Failed to parse session');
      process.exit(1);
    }
  } else {
    console.info('Usage:');
    console.info('  npx tsx tools/content/generate-content.ts <session.jsonl>');
    console.info('  npx tsx tools/content/generate-content.ts --recent');
    console.info('  npx tsx tools/content/generate-content.ts --recent --output=./docs');
  }
}
