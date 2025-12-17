#!/usr/bin/env npx tsx
/**
 * Build static site from content/books to docs/books
 * Converts markdown to simple HTML pages
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

const CONTENT_DIR = path.join(process.cwd(), 'content/books');
const OUTPUT_DIR = path.join(process.cwd(), 'docs/books');

interface BookOutline {
  id: string;
  title: string;
  file: string;
  status: string;
}

interface BookMeta {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  outline: BookOutline[];
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Code blocks (must be before inline code)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang: string | undefined, code: string) => {
      return `<pre><code class="language-${lang ?? ''}">${escapeHtml(code.trim())}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Paragraphs (simple approach)
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>\n');

  // Wrap in paragraph tags
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateBookHtml(book: BookMeta, chapters: Array<{ title: string; content: string; file: string }>): string {
  const toc = chapters.map((ch, i) =>
    `<li><a href="#chapter-${i}">${ch.title}</a></li>`
  ).join('\n');

  const content = chapters.map((ch, i) => `
    <section id="chapter-${i}" class="chapter">
      <h2>${ch.title}</h2>
      ${markdownToHtml(ch.content)}
    </section>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(book.title)} | metavibe</title>
  <meta name="description" content="${escapeHtml(book.description?.split('\n')[0] || book.subtitle)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #fdfcfa;
      --text: #1a1a1a;
      --text-muted: #666;
      --accent: #6366f1;
      --border: #e5e5e5;
      --code-bg: #f3f4f6;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111;
        --text: #e5e5e5;
        --text-muted: #999;
        --border: #333;
        --code-bg: #1a1a1a;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Lexend', 'Roboto Slab', 'Rockwell', 'Courier Bold', serif;
      line-height: 1.7;
      color: var(--text);
      background: var(--bg);
    }
    .container { max-width: 720px; margin: 0 auto; padding: 2rem; }
    header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 1rem; }
    .back { display: inline-block; margin-bottom: 1rem; color: var(--accent); text-decoration: none; font-size: 0.9rem; }
    .back:hover { text-decoration: underline; }
    nav { margin: 2rem 0; padding: 1.5rem; background: var(--code-bg); border-radius: 8px; }
    nav h2 { font-size: 1rem; margin-bottom: 1rem; }
    nav ul { list-style: none; padding-left: 0; }
    nav li { margin: 0.5rem 0; }
    nav a { color: var(--accent); text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    .chapter { margin: 3rem 0; padding-top: 2rem; border-top: 1px solid var(--border); }
    h2 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 1rem; }
    h3 { font-size: 1.1rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
    p { margin: 1rem 0; }
    a { color: var(--accent); }
    code { font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em; background: var(--code-bg); padding: 0.2em 0.4em; border-radius: 3px; }
    pre { background: var(--code-bg); padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; padding: 0; font-size: 0.85em; }
    strong { font-weight: 600; }
    ul, ol { margin: 1rem 0; padding-left: 1.5rem; }
    li { margin: 0.5rem 0; }
    footer { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); text-align: center; color: var(--text-muted); font-size: 0.9rem; font-family: sans-serif; }
  </style>
</head>
<body>
  <div class="container">
    <a href="../../" class="back">← Back to all books</a>
    <header>
      <h1>${escapeHtml(book.title)}</h1>
      <p class="subtitle">${escapeHtml(book.subtitle)}</p>
    </header>

    <nav>
      <h2>Table of Contents</h2>
      <ul>
        ${toc}
      </ul>
    </nav>

    <main>
      ${content}
    </main>

    <footer>
      <p>Generated with <a href="https://claude.ai/code">Claude Code</a> | <a href="https://github.com/bedwards/metavibe">View source</a></p>
    </footer>
  </div>
</body>
</html>`;
}

async function buildBook(bookDir: string): Promise<void> {
  const slug = path.basename(bookDir);
  console.info(`Building book: ${slug}`);

  // Read book.yaml
  const bookYamlPath = path.join(bookDir, 'book.yaml');
  const bookYaml = await fs.readFile(bookYamlPath, 'utf-8');
  const book = yaml.parse(bookYaml) as BookMeta;

  // Read chapters
  const chapters: Array<{ title: string; content: string; file: string }> = [];

  for (const chapter of book.outline) {
    const chapterPath = path.join(bookDir, chapter.file);
    try {
      let content = await fs.readFile(chapterPath, 'utf-8');
      // Remove the first H1 (title) since we show it in the chapter header
      content = content.replace(/^# .+\n+/, '');
      chapters.push({
        title: chapter.title,
        content,
        file: chapter.file,
      });
    } catch {
      console.warn(`  Warning: Could not read ${chapter.file}`);
    }
  }

  // Generate HTML
  const html = generateBookHtml(book, chapters);

  // Write output
  const outputDir = path.join(OUTPUT_DIR, slug);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'index.html'), html);

  console.info(`  ✓ Generated ${chapters.length} chapters`);
}

async function main(): Promise<void> {
  console.info('Building metavibe static site...\n');

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Find all books
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
  const bookDirs = entries
    .filter(e => e.isDirectory())
    .map(e => path.join(CONTENT_DIR, e.name));

  // Build each book
  for (const bookDir of bookDirs) {
    try {
      await buildBook(bookDir);
    } catch (err) {
      console.error(`  Error building ${path.basename(bookDir)}:`, err);
    }
  }

  console.info('\n✅ Site build complete!');
  console.info(`Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
