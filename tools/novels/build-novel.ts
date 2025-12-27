#!/usr/bin/env npx tsx

/**
 * Build script for novels
 * Generates HTML pages (full and by-chapter) from markdown source
 *
 * Usage: npx tsx tools/novels/build-novel.ts --novel change-without-notice
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const NOVELS_DIR = join(process.cwd(), 'novels');

interface NovelConfig {
  title: string;
  slug: string;
  subtitle: string;
  author: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  publication: {
    date: string;
    edition: string;
  };
  chapters: Array<{
    id: string;
    title: string;
    file: string;
    pages?: string;
    type?: string;
  }>;
}

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Paragraphs (wrap non-tag lines)
  const lines = html.split('\n');
  const processed: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (inParagraph) {
        processed.push('</p>');
        inParagraph = false;
      }
      processed.push('');
    } else if (trimmed.startsWith('<h') || trimmed.startsWith('<hr') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<ol')) {
      if (inParagraph) {
        processed.push('</p>');
        inParagraph = false;
      }
      processed.push(line);
    } else {
      if (!inParagraph) {
        processed.push('<p>' + line);
        inParagraph = true;
      } else {
        processed.push(line);
      }
    }
  }
  if (inParagraph) {
    processed.push('</p>');
  }

  return processed.join('\n');
}

function generatePageTemplate(title: string, content: string, config: NovelConfig, nav?: { prev?: string; next?: string }): string {
  const navHtml = nav ? `
  <nav class="chapter-nav">
    ${nav.prev ? `<a href="${nav.prev}" class="prev">&larr; Previous</a>` : '<span></span>'}
    <a href="index.html">Contents</a>
    ${nav.next ? `<a href="${nav.next}" class="next">Next &rarr;</a>` : '<span></span>'}
  </nav>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${config.title}</title>
  <style>
    :root {
      --bg: #fafafa;
      --text: #1a1a1a;
      --link: #0066cc;
      --border: #e0e0e0;
      --subtle: #666;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --text: #e0e0e0;
        --link: #6db3f2;
        --border: #333;
        --subtle: #999;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.8;
      max-width: 38rem;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    h1 { font-size: 1.75rem; margin: 2rem 0 1rem; font-weight: normal; }
    h2 { font-size: 1.25rem; margin: 2rem 0 1rem; font-weight: normal; }
    h3 { font-size: 1rem; margin: 1.5rem 0 0.75rem; font-weight: normal; }
    p { margin-bottom: 1rem; text-align: justify; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
    .chapter-nav {
      display: flex;
      justify-content: space-between;
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    .chapter-nav a { color: var(--link); text-decoration: none; }
    .chapter-nav a:hover { text-decoration: underline; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--subtle); font-size: 0.875rem; }
  </style>
</head>
<body>
  ${navHtml}

  <article>
    ${content}
  </article>

  ${navHtml}

  <footer>
    <p>${config.author.name} | ${config.author.location} | ${config.publication.date}</p>
  </footer>
</body>
</html>`;
}

function buildNovel(novelSlug: string): void {
  const novelDir = join(NOVELS_DIR, novelSlug.replace(/-/g, '_').replace(/^c/, 'C'));

  // Try different directory naming conventions
  let actualDir = novelDir;
  if (!existsSync(actualDir)) {
    const alternatives = readdirSync(NOVELS_DIR).filter(d =>
      d.toLowerCase().includes(novelSlug.replace(/-/g, '').toLowerCase()) ||
      d.toLowerCase().replace(/_/g, '-') === novelSlug
    );
    if (alternatives.length > 0) {
      actualDir = join(NOVELS_DIR, alternatives[0]);
    }
  }

  console.info(`Building novel from: ${actualDir}`);

  // Read config
  const configPath = join(actualDir, 'novel.yaml');
  if (!existsSync(configPath)) {
    throw new Error(`Novel config not found: ${configPath}`);
  }
  const config = parseYaml(readFileSync(configPath, 'utf-8')) as NovelConfig;

  // Create output directory
  const outputDir = join(actualDir, 'website');
  mkdirSync(outputDir, { recursive: true });

  // Build individual chapter pages
  const chapterFiles: string[] = [];

  for (let i = 0; i < config.chapters.length; i++) {
    const chapter = config.chapters[i];
    const chapterPath = join(actualDir, chapter.file);

    if (!existsSync(chapterPath)) {
      console.warn(`Chapter file not found: ${chapterPath}`);
      continue;
    }

    const markdown = readFileSync(chapterPath, 'utf-8');
    const html = markdownToHtml(markdown);

    const outputFile = chapter.type === 'front-matter' ? 'front-matter.html' :
                       chapter.type === 'end-matter' ? 'end-matter.html' :
                       `chapter-${chapter.id.replace('chapter-', '').padStart(2, '0')}.html`;

    chapterFiles.push(outputFile);

    const prev = i > 0 ? chapterFiles[i - 1] : undefined;

    const page = generatePageTemplate(chapter.title, html, config, { prev });
    writeFileSync(join(outputDir, outputFile), page);
    console.info(`  Generated: ${outputFile}`);
  }

  // Update next links (second pass)
  for (let i = 0; i < chapterFiles.length; i++) {
    const filePath = join(outputDir, chapterFiles[i]);
    let content = readFileSync(filePath, 'utf-8');

    if (i < chapterFiles.length - 1) {
      // Add next link
      content = content.replace(
        /<a href="index\.html">Contents<\/a>\s*<span><\/span>/g,
        `<a href="index.html">Contents</a>\n    <a href="${chapterFiles[i + 1]}" class="next">Next &rarr;</a>`
      );
    }

    writeFileSync(filePath, content);
  }

  // Build full single-page version
  console.info('  Generating full.html...');
  let fullContent = '';

  for (const chapter of config.chapters) {
    const chapterPath = join(actualDir, chapter.file);
    if (existsSync(chapterPath)) {
      const markdown = readFileSync(chapterPath, 'utf-8');
      fullContent += markdownToHtml(markdown) + '\n<hr>\n';
    }
  }

  const fullPage = generatePageTemplate('Complete Novel', fullContent, config);
  writeFileSync(join(outputDir, 'full.html'), fullPage);

  console.info(`\nNovel built successfully: ${outputDir}`);
  console.info(`\nTo generate EPUB and PDF, install pandoc and run:`);
  console.info(`  pandoc ${outputDir}/full.html -o ${outputDir}/${config.slug}.epub`);
  console.info(`  pandoc ${outputDir}/full.html -o ${outputDir}/${config.slug}.pdf`);
}

// Main
const args = process.argv.slice(2);
const novelIndex = args.indexOf('--novel');

if (novelIndex === -1 || !args[novelIndex + 1]) {
  console.info('Usage: npx tsx tools/novels/build-novel.ts --novel <slug>');
  console.info('Example: npx tsx tools/novels/build-novel.ts --novel change-without-notice');
  process.exit(1);
}

const novelSlug = args[novelIndex + 1];
buildNovel(novelSlug);
