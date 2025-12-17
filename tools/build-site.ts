#!/usr/bin/env npx tsx
/**
 * Build static site from content/books to docs/books
 * Converts markdown to simple HTML pages
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

const BOOKS_CONTENT_DIR = path.join(process.cwd(), 'content/books');
const ESSAYS_CONTENT_DIR = path.join(process.cwd(), 'content/essays');
const BOOKS_OUTPUT_DIR = path.join(process.cwd(), 'docs/books');
const ESSAYS_OUTPUT_DIR = path.join(process.cwd(), 'docs/essays');

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

interface EssayMeta {
  title: string;
  slug: string;
  status: string;
  date: string;
  updated: string;
  description: string;
  tags: string[];
  audience: string[];
  publishing: {
    github_pages: boolean;
    gumroad: boolean;
    kobo: boolean;
  };
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

function generateEssayHtml(essay: EssayMeta, content: string): string {
  const tagsHtml = essay.tags.map(tag =>
    `<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(essay.title)} | metavibe</title>
  <meta name="description" content="${escapeHtml(essay.description?.split('\n')[0] || essay.title)}">
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
    .meta { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem; }
    .back { display: inline-block; margin-bottom: 1rem; color: var(--accent); text-decoration: none; font-size: 0.9rem; }
    .back:hover { text-decoration: underline; }
    .tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
    .tag { background: var(--code-bg); color: var(--text-muted); padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; }
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
    <a href="../" class="back">← Back to essays</a>
    <header>
      <h1>${escapeHtml(essay.title)}</h1>
      <p class="meta">${essay.date}</p>
      <div class="tags">${tagsHtml}</div>
    </header>

    <main>
      ${markdownToHtml(content)}
    </main>

    <footer>
      <p>Generated with <a href="https://claude.ai/code">Claude Code</a> | <a href="https://github.com/bedwards/metavibe">View source</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function generateEssaysIndexHtml(essays: Array<{ meta: EssayMeta; slug: string }>): string {
  const allTags = [...new Set(essays.flatMap(e => e.meta.tags))].sort();

  const tagsHtml = allTags.map(tag =>
    `<button class="tag-filter" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
  ).join('');

  const essaysHtml = essays.map(({ meta, slug }) => {
    const tagsData = meta.tags.map(t => escapeHtml(t)).join(',');
    const tagsDisplay = meta.tags.map(tag =>
      `<span class="tag">${escapeHtml(tag)}</span>`
    ).join('');

    return `
    <article class="essay-card" data-tags="${tagsData}">
      <a href="${slug}/">
        <h3>${escapeHtml(meta.title)}</h3>
        <p class="description">${escapeHtml(meta.description?.split('\n')[0] || '')}</p>
        <div class="tags">${tagsDisplay}</div>
      </a>
    </article>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Essays | metavibe</title>
  <meta name="description" content="Essays on vibe coding, AI-first development, and building software with Claude.">
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
    .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
    header { margin-bottom: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 1rem; }
    .back { display: inline-block; margin-bottom: 1rem; color: var(--accent); text-decoration: none; font-size: 0.9rem; }
    .back:hover { text-decoration: underline; }
    .search-container { margin: 1.5rem 0; }
    .search-input {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      color: var(--text);
    }
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .tag-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0 2rem;
    }
    .tag-filter {
      background: var(--code-bg);
      color: var(--text-muted);
      border: none;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tag-filter:hover {
      background: var(--accent);
      color: white;
    }
    .tag-filter.active {
      background: var(--accent);
      color: white;
    }
    .essays-grid {
      display: grid;
      gap: 1.5rem;
    }
    .essay-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      transition: border-color 0.2s;
    }
    .essay-card:hover {
      border-color: var(--accent);
    }
    .essay-card.hidden {
      display: none;
    }
    .essay-card a {
      text-decoration: none;
      color: inherit;
    }
    .essay-card h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text);
    }
    .essay-card:hover h3 {
      text-decoration: underline;
    }
    .essay-card .description {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }
    .essay-card .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .essay-card .tag {
      background: var(--code-bg);
      color: var(--text-muted);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    footer { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); text-align: center; color: var(--text-muted); font-size: 0.9rem; font-family: sans-serif; }
  </style>
</head>
<body>
  <div class="container">
    <a href="../" class="back">← Back to home</a>
    <header>
      <h1>Essays</h1>
      <p class="subtitle">Thoughts on vibe coding and AI-first development</p>
    </header>

    <div class="search-container">
      <input type="text" class="search-input" placeholder="Search essays..." id="searchInput">
    </div>

    <div class="tag-filters">
      <button class="tag-filter active" data-tag="all">all</button>
      ${tagsHtml}
    </div>

    <div class="essays-grid">
      ${essaysHtml}
    </div>

    <footer>
      <p>Generated with <a href="https://claude.ai/code">Claude Code</a> | <a href="https://github.com/bedwards/metavibe">View source</a></p>
    </footer>
  </div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const tagButtons = document.querySelectorAll('.tag-filter');
    const essayCards = document.querySelectorAll('.essay-card');
    let activeTag = 'all';

    function filterEssays() {
      const searchTerm = searchInput.value.toLowerCase();

      essayCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.description').textContent.toLowerCase();
        const tags = card.dataset.tags.split(',');

        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
        const matchesTag = activeTag === 'all' || tags.includes(activeTag);

        if (matchesSearch && matchesTag) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }

    searchInput.addEventListener('input', filterEssays);

    tagButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tagButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTag = btn.dataset.tag;
        filterEssays();
      });
    });
  </script>
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
  const outputDir = path.join(BOOKS_OUTPUT_DIR, slug);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'index.html'), html);

  console.info(`  ✓ Generated ${chapters.length} chapters`);
}

function parseEssayFrontmatter(content: string): { meta: EssayMeta; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Invalid essay format: missing frontmatter');
  }
  const meta = yaml.parse(match[1]) as EssayMeta;
  // Remove the H1 title since we show it in the header
  const body = match[2].replace(/^# .+\n+/, '');
  return { meta, body };
}

async function buildEssay(essayPath: string): Promise<{ meta: EssayMeta; slug: string } | null> {
  const filename = path.basename(essayPath, '.md');
  console.info(`Building essay: ${filename}`);

  const content = await fs.readFile(essayPath, 'utf-8');
  const { meta, body } = parseEssayFrontmatter(content);

  // Skip non-published essays
  if (meta.status !== 'published' || !meta.publishing?.github_pages) {
    console.info(`  ⏭ Skipping (not published for GitHub Pages)`);
    return null;
  }

  const slug = meta.slug || filename;
  const html = generateEssayHtml(meta, body);

  const outputDir = path.join(ESSAYS_OUTPUT_DIR, slug);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'index.html'), html);

  console.info(`  ✓ Generated essay`);
  return { meta, slug };
}

async function buildEssays(): Promise<void> {
  console.info('\nBuilding essays...\n');

  await fs.mkdir(ESSAYS_OUTPUT_DIR, { recursive: true });

  // Find all essay files
  const entries = await fs.readdir(ESSAYS_CONTENT_DIR, { withFileTypes: true });
  const essayFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => path.join(ESSAYS_CONTENT_DIR, e.name));

  // Build each essay
  const essays: Array<{ meta: EssayMeta; slug: string }> = [];
  for (const essayPath of essayFiles) {
    try {
      const result = await buildEssay(essayPath);
      if (result) {
        essays.push(result);
      }
    } catch (err) {
      console.error(`  Error building ${path.basename(essayPath)}:`, err);
    }
  }

  // Sort essays by date (newest first)
  essays.sort((a, b) => b.meta.date.localeCompare(a.meta.date));

  // Generate essays index page
  const indexHtml = generateEssaysIndexHtml(essays);
  await fs.writeFile(path.join(ESSAYS_OUTPUT_DIR, 'index.html'), indexHtml);

  console.info(`\n✓ Built ${essays.length} essays`);
}

async function buildBooks(): Promise<void> {
  console.info('Building books...\n');

  // Ensure output directory exists
  await fs.mkdir(BOOKS_OUTPUT_DIR, { recursive: true });

  // Find all books
  const entries = await fs.readdir(BOOKS_CONTENT_DIR, { withFileTypes: true });
  const bookDirs = entries
    .filter(e => e.isDirectory())
    .map(e => path.join(BOOKS_CONTENT_DIR, e.name));

  // Build each book
  for (const bookDir of bookDirs) {
    try {
      await buildBook(bookDir);
    } catch (err) {
      console.error(`  Error building ${path.basename(bookDir)}:`, err);
    }
  }
}

async function main(): Promise<void> {
  console.info('Building metavibe static site...\n');

  // Build books
  await buildBooks();

  // Build essays
  await buildEssays();

  console.info('\n✅ Site build complete!');
  console.info(`Output: docs/`);
}

main().catch(console.error);
