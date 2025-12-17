# Building the Reader Interface

## Typography for Reading

Good reading typography is invisible. Bad typography causes eyestrain, fatigue, and abandonment. The difference is attention to detail.

### Font Selection

For long-form reading, serif fonts outperform sans-serif. The serifs guide the eye along the baseline, reducing cognitive load. But the web complicates this—system fonts vary wildly.

A safe approach: use a font stack that degrades gracefully.

```css
/* styles/reader.css */

:root {
  /* Reading fonts */
  --font-serif: 'Charter', 'Bitstream Charter', 'Sitka Text', Cambria,
    'Noto Serif', serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono',
    Menlo, Consolas, monospace;

  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  /* Colors - light mode */
  --color-bg: #fdfcfa;
  --color-bg-secondary: #f5f3f0;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e5e5e5;
  --color-link: #0066cc;
  --color-link-visited: #551a8b;
  --color-highlight: #fff3cd;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a1a;
    --color-bg-secondary: #2a2a2a;
    --color-text: #e5e5e5;
    --color-text-secondary: #999999;
    --color-border: #404040;
    --color-link: #6db3f2;
    --color-link-visited: #b794f4;
    --color-highlight: #4a4520;
  }
}

/* Manual dark mode toggle */
[data-theme='dark'] {
  --color-bg: #1a1a1a;
  --color-bg-secondary: #2a2a2a;
  --color-text: #e5e5e5;
  --color-text-secondary: #999999;
  --color-border: #404040;
  --color-link: #6db3f2;
  --color-link-visited: #b794f4;
  --color-highlight: #4a4520;
}

[data-theme='light'] {
  --color-bg: #fdfcfa;
  --color-bg-secondary: #f5f3f0;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e5e5e5;
  --color-link: #0066cc;
  --color-link-visited: #551a8b;
  --color-highlight: #fff3cd;
}
```

### Line Length and Spacing

The optimal line length for reading is 50-75 characters. Too short causes excessive eye movement. Too long causes readers to lose their place.

```css
/* Reader container */
.reader {
  max-width: 65ch;
  margin: 0 auto;
  padding: var(--space-4);
  background: var(--color-bg);
  color: var(--color-text);
}

/* Typography */
.reader-content {
  font-family: var(--font-serif);
  font-size: 1.125rem; /* 18px base */
  line-height: 1.7;
  letter-spacing: -0.003em;
}

.reader-content p {
  margin-bottom: var(--space-4);
}

.reader-content h1,
.reader-content h2,
.reader-content h3,
.reader-content h4 {
  font-family: var(--font-sans);
  font-weight: 600;
  line-height: 1.3;
  margin-top: var(--space-8);
  margin-bottom: var(--space-4);
}

.reader-content h1 {
  font-size: 2rem;
}

.reader-content h2 {
  font-size: 1.5rem;
}

.reader-content h3 {
  font-size: 1.25rem;
}

/* Links */
.reader-content a {
  color: var(--color-link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.reader-content a:visited {
  color: var(--color-link-visited);
}

.reader-content a:hover {
  text-decoration-thickness: 2px;
}

/* Code */
.reader-content code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--color-bg-secondary);
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

.reader-content pre {
  background: var(--color-bg-secondary);
  padding: var(--space-4);
  border-radius: 6px;
  overflow-x: auto;
  margin: var(--space-6) 0;
}

.reader-content pre code {
  background: none;
  padding: 0;
}

/* Blockquotes */
.reader-content blockquote {
  border-left: 3px solid var(--color-border);
  padding-left: var(--space-4);
  margin-left: 0;
  font-style: italic;
  color: var(--color-text-secondary);
}

/* Lists */
.reader-content ul,
.reader-content ol {
  padding-left: var(--space-6);
  margin-bottom: var(--space-4);
}

.reader-content li {
  margin-bottom: var(--space-2);
}

/* Images */
.reader-content img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: var(--space-6) 0;
}

.reader-content figure {
  margin: var(--space-6) 0;
}

.reader-content figcaption {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: var(--space-2);
}
```

## Reader Component

```typescript
// web/src/components/Reader.ts

interface ReaderOptions {
  articleId: string;
  onProgressUpdate?: (progress: number) => void;
}

export class Reader {
  private container: HTMLElement;
  private article: Article | null = null;
  private options: ReaderOptions;
  private scrollObserver: IntersectionObserver | null = null;

  constructor(containerId: string, options: ReaderOptions) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container not found');
    this.container = container;
    this.options = options;

    this.load();
  }

  private async load(): Promise<void> {
    this.container.innerHTML = '<div class="reader-loading">Loading...</div>';

    try {
      const response = await fetch(`/api/articles/${this.options.articleId}`);
      if (!response.ok) throw new Error('Failed to load article');

      this.article = await response.json();
      this.render();
      this.setupScrollTracking();
      this.restoreProgress();
    } catch (error) {
      this.container.innerHTML = `
        <div class="reader-error">
          Failed to load article. <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  private render(): void {
    if (!this.article) return;

    const readingTime = this.article.readingTimeMinutes;
    const readingTimeText =
      readingTime === 1 ? '1 min read' : `${readingTime} min read`;

    this.container.innerHTML = `
      <article class="reader">
        <header class="reader-header">
          <h1 class="reader-title">${this.escapeHtml(this.article.title)}</h1>
          <div class="reader-meta">
            ${this.article.author ? `<span class="reader-author">${this.escapeHtml(this.article.author)}</span>` : ''}
            ${this.article.publishedAt ? `<time datetime="${this.article.publishedAt}">${this.formatDate(this.article.publishedAt)}</time>` : ''}
            <span class="reader-reading-time">${readingTimeText}</span>
          </div>
        </header>

        <div class="reader-progress">
          <div class="reader-progress-bar"></div>
        </div>

        <div class="reader-content">
          ${this.article.content}
        </div>

        <footer class="reader-footer">
          <div class="reader-actions">
            <button class="action-favorite ${this.article.isFavorite ? 'active' : ''}"
                    data-action="favorite">
              ${this.article.isFavorite ? '★' : '☆'} Favorite
            </button>
            <button class="action-archive" data-action="archive">
              Archive
            </button>
            <a href="${this.escapeHtml(this.article.url)}"
               target="_blank" rel="noopener"
               class="action-original">
              View Original
            </a>
          </div>
        </footer>
      </article>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Action buttons
    this.container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        if (action === 'favorite') this.toggleFavorite();
        if (action === 'archive') this.archive();
      });
    });
  }

  private setupScrollTracking(): void {
    // Track reading progress via scroll position
    const content = this.container.querySelector('.reader-content');
    if (!content) return;

    const progressBar = this.container.querySelector(
      '.reader-progress-bar'
    ) as HTMLElement;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = scrollTop / (docHeight - winHeight);
      const progress = Math.min(Math.max(scrollPercent, 0), 1);

      if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
      }

      // Debounced save
      this.saveProgress(progress);

      // Notify callback
      this.options.onProgressUpdate?.(progress);
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  private saveProgressTimeout: number | null = null;

  private saveProgress(progress: number): void {
    if (this.saveProgressTimeout) {
      clearTimeout(this.saveProgressTimeout);
    }

    this.saveProgressTimeout = window.setTimeout(async () => {
      if (!this.article) return;

      await fetch(`/api/articles/${this.article.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrollPosition: progress }),
      });

      // Mark as read when 90% scrolled
      if (progress > 0.9 && !this.article.isRead) {
        await fetch(`/api/articles/${this.article.id}/read`, {
          method: 'POST',
        });
        this.article.isRead = true;
      }
    }, 1000);
  }

  private async restoreProgress(): Promise<void> {
    if (!this.article) return;

    try {
      const response = await fetch(
        `/api/articles/${this.article.id}/progress`
      );
      if (!response.ok) return;

      const progress = await response.json();
      if (progress.scrollPosition > 0.05) {
        // Scroll to saved position
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const scrollTo = progress.scrollPosition * (docHeight - winHeight);

        window.scrollTo({ top: scrollTo, behavior: 'instant' });
      }
    } catch {
      // Ignore errors
    }
  }

  private async toggleFavorite(): Promise<void> {
    if (!this.article) return;

    const response = await fetch(`/api/articles/${this.article.id}/favorite`, {
      method: 'POST',
    });

    if (response.ok) {
      this.article = await response.json();
      const btn = this.container.querySelector('.action-favorite');
      if (btn) {
        btn.classList.toggle('active', this.article.isFavorite);
        btn.innerHTML = `${this.article.isFavorite ? '★' : '☆'} Favorite`;
      }
    }
  }

  private async archive(): Promise<void> {
    if (!this.article) return;

    const response = await fetch(`/api/articles/${this.article.id}/archive`, {
      method: 'POST',
    });

    if (response.ok) {
      // Navigate back to list
      window.history.back();
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

## Reading Progress API

```typescript
// src/api/routes/progress.ts
import { Router } from 'express';
import { query, queryOne, execute } from '../../db/client.js';
import type { ReadingProgress } from '../../types/index.js';

export const progressRouter = Router();

// Get progress for article
progressRouter.get('/:articleId/progress', async (req, res, next) => {
  try {
    const progress = await queryOne<ReadingProgress>(
      `SELECT * FROM reading_progress WHERE article_id = $1`,
      [req.params.articleId]
    );

    if (!progress) {
      res.json({ scrollPosition: 0, audioPosition: 0 });
      return;
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
});

// Update progress
progressRouter.put('/:articleId/progress', async (req, res, next) => {
  try {
    const { scrollPosition, audioPosition } = req.body;

    const progress = await queryOne<ReadingProgress>(
      `INSERT INTO reading_progress (article_id, scroll_position, audio_position, last_read_at)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, 0), NOW())
       ON CONFLICT (article_id) DO UPDATE SET
         scroll_position = COALESCE($2, reading_progress.scroll_position),
         audio_position = COALESCE($3, reading_progress.audio_position),
         last_read_at = NOW()
       RETURNING *`,
      [req.params.articleId, scrollPosition, audioPosition]
    );

    res.json(progress);
  } catch (error) {
    next(error);
  }
});
```

## Article List Component

```typescript
// web/src/components/ArticleList.ts

interface ArticleListOptions {
  feedId?: string;
  tagId?: string;
  showUnreadOnly?: boolean;
}

export class ArticleList {
  private container: HTMLElement;
  private options: ArticleListOptions;
  private articles: Article[] = [];
  private total = 0;
  private page = 0;
  private pageSize = 20;
  private loading = false;

  constructor(containerId: string, options: ArticleListOptions = {}) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container not found');
    this.container = container;
    this.options = options;

    this.render();
    this.loadArticles();
    this.setupInfiniteScroll();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="article-list">
        <header class="list-header">
          <div class="list-filters">
            <button class="filter-btn active" data-filter="unread">Unread</button>
            <button class="filter-btn" data-filter="all">All</button>
            <button class="filter-btn" data-filter="favorites">Favorites</button>
          </div>
          <div class="list-search">
            <input type="search" placeholder="Search articles..." />
          </div>
        </header>
        <div class="list-items"></div>
        <div class="list-loading" style="display: none;">Loading...</div>
        <div class="list-empty" style="display: none;">No articles found</div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Filter buttons
    this.container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).dataset.filter;
        this.setFilter(filter);
      });
    });

    // Search
    const searchInput = this.container.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement;
    let searchTimeout: number;

    searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(() => {
        this.search(searchInput.value);
      }, 300);
    });
  }

  private async loadArticles(append = false): Promise<void> {
    if (this.loading) return;
    this.loading = true;

    const loadingEl = this.container.querySelector('.list-loading');
    if (loadingEl) loadingEl.style.display = 'block';

    try {
      const params = new URLSearchParams({
        limit: this.pageSize.toString(),
        offset: (this.page * this.pageSize).toString(),
      });

      if (this.options.feedId) params.set('feedId', this.options.feedId);
      if (this.options.tagId) params.set('tagId', this.options.tagId);
      if (this.options.showUnreadOnly) params.set('isRead', 'false');

      const response = await fetch(`/api/articles?${params}`);
      const data = await response.json();

      if (append) {
        this.articles.push(...data.articles);
      } else {
        this.articles = data.articles;
      }
      this.total = data.total;

      this.renderArticles();
    } finally {
      this.loading = false;
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  private renderArticles(): void {
    const listItems = this.container.querySelector('.list-items');
    const emptyEl = this.container.querySelector('.list-empty');

    if (!listItems || !emptyEl) return;

    if (this.articles.length === 0) {
      listItems.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    listItems.innerHTML = this.articles
      .map((article) => this.renderArticleItem(article))
      .join('');

    // Add click handlers
    listItems.querySelectorAll('.article-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        if (id) this.openArticle(id);
      });
    });
  }

  private renderArticleItem(article: Article): string {
    const date = article.publishedAt
      ? new Date(article.publishedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : '';

    return `
      <article class="article-item ${article.isRead ? 'read' : ''}" data-id="${article.id}">
        <div class="article-content">
          <h3 class="article-title">${this.escapeHtml(article.title)}</h3>
          ${article.excerpt ? `<p class="article-excerpt">${this.escapeHtml(article.excerpt.slice(0, 150))}...</p>` : ''}
          <div class="article-meta">
            ${article.author ? `<span class="article-author">${this.escapeHtml(article.author)}</span>` : ''}
            ${date ? `<span class="article-date">${date}</span>` : ''}
            <span class="article-time">${article.readingTimeMinutes} min</span>
          </div>
        </div>
        ${article.imageUrl ? `<img class="article-thumb" src="${this.escapeHtml(article.imageUrl)}" alt="" loading="lazy" />` : ''}
      </article>
    `;
  }

  private setupInfiniteScroll(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.loading) {
          if (this.articles.length < this.total) {
            this.page++;
            this.loadArticles(true);
          }
        }
      },
      { rootMargin: '100px' }
    );

    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    this.container.appendChild(sentinel);
    observer.observe(sentinel);
  }

  private setFilter(filter: string | undefined): void {
    // Update button states
    this.container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Update options
    this.options.showUnreadOnly = filter === 'unread';
    if (filter === 'favorites') {
      // Would need to add isFavorite filter
    }

    // Reload
    this.page = 0;
    this.loadArticles();
  }

  private search(query: string): void {
    // Would need to add search param handling
    this.page = 0;
    this.loadArticles();
  }

  private openArticle(id: string): void {
    window.location.href = `/read/${id}`;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

## Article List Styles

```css
/* styles/article-list.css */

.article-list {
  max-width: 800px;
  margin: 0 auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-bg);
  z-index: 10;
}

.list-filters {
  display: flex;
  gap: var(--space-2);
}

.filter-btn {
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.875rem;
}

.filter-btn:hover {
  background: var(--color-bg-secondary);
}

.filter-btn.active {
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-weight: 500;
}

.list-search input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.875rem;
  width: 200px;
}

.article-item {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s;
}

.article-item:hover {
  background: var(--color-bg-secondary);
}

.article-item.read {
  opacity: 0.7;
}

.article-item.read .article-title {
  font-weight: 400;
}

.article-content {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
  line-height: 1.3;
}

.article-excerpt {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-2);
  line-height: 1.5;
}

.article-meta {
  display: flex;
  gap: var(--space-3);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.article-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.list-loading,
.list-empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
}

/* Reader styles */
.reader {
  max-width: 65ch;
  margin: 0 auto;
  padding: var(--space-4);
}

.reader-header {
  margin-bottom: var(--space-8);
}

.reader-title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 var(--space-4);
}

.reader-meta {
  display: flex;
  gap: var(--space-4);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.reader-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-border);
  z-index: 100;
}

.reader-progress-bar {
  height: 100%;
  background: var(--color-link);
  width: 0;
  transition: width 0.1s;
}

.reader-footer {
  margin-top: var(--space-12);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.reader-actions {
  display: flex;
  gap: var(--space-4);
}

.reader-actions button,
.reader-actions a {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
}

.reader-actions button:hover,
.reader-actions a:hover {
  background: var(--color-bg-secondary);
}

.reader-actions .active {
  background: var(--color-highlight);
  border-color: transparent;
}
```

## Settings Panel

Let users customize their reading experience:

```typescript
// web/src/components/Settings.ts

interface ReaderSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'serif' | 'sans';
  lineHeight: 'compact' | 'normal' | 'relaxed';
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'system',
  fontSize: 'medium',
  fontFamily: 'serif',
  lineHeight: 'normal',
};

export class Settings {
  private settings: ReaderSettings;

  constructor() {
    this.settings = this.load();
    this.apply();
  }

  private load(): ReaderSettings {
    try {
      const saved = localStorage.getItem('reader-settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SETTINGS;
  }

  private save(): void {
    localStorage.setItem('reader-settings', JSON.stringify(this.settings));
  }

  private apply(): void {
    const root = document.documentElement;

    // Theme
    if (this.settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', this.settings.theme);
    }

    // Font size
    const fontSizes = { small: '16px', medium: '18px', large: '20px' };
    root.style.setProperty('--reader-font-size', fontSizes[this.settings.fontSize]);

    // Font family
    root.setAttribute('data-font', this.settings.fontFamily);

    // Line height
    const lineHeights = { compact: '1.5', normal: '1.7', relaxed: '1.9' };
    root.style.setProperty(
      '--reader-line-height',
      lineHeights[this.settings.lineHeight]
    );
  }

  update(changes: Partial<ReaderSettings>): void {
    this.settings = { ...this.settings, ...changes };
    this.save();
    this.apply();
  }

  get(): ReaderSettings {
    return { ...this.settings };
  }

  renderPanel(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="settings-panel">
        <h2>Reading Settings</h2>

        <div class="setting-group">
          <label>Theme</label>
          <div class="setting-options">
            <button data-setting="theme" data-value="light"
                    class="${this.settings.theme === 'light' ? 'active' : ''}">
              Light
            </button>
            <button data-setting="theme" data-value="dark"
                    class="${this.settings.theme === 'dark' ? 'active' : ''}">
              Dark
            </button>
            <button data-setting="theme" data-value="system"
                    class="${this.settings.theme === 'system' ? 'active' : ''}">
              System
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>Font Size</label>
          <div class="setting-options">
            <button data-setting="fontSize" data-value="small"
                    class="${this.settings.fontSize === 'small' ? 'active' : ''}">
              Small
            </button>
            <button data-setting="fontSize" data-value="medium"
                    class="${this.settings.fontSize === 'medium' ? 'active' : ''}">
              Medium
            </button>
            <button data-setting="fontSize" data-value="large"
                    class="${this.settings.fontSize === 'large' ? 'active' : ''}">
              Large
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>Font</label>
          <div class="setting-options">
            <button data-setting="fontFamily" data-value="serif"
                    class="${this.settings.fontFamily === 'serif' ? 'active' : ''}">
              Serif
            </button>
            <button data-setting="fontFamily" data-value="sans"
                    class="${this.settings.fontFamily === 'sans' ? 'active' : ''}">
              Sans
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>Line Spacing</label>
          <div class="setting-options">
            <button data-setting="lineHeight" data-value="compact"
                    class="${this.settings.lineHeight === 'compact' ? 'active' : ''}">
              Compact
            </button>
            <button data-setting="lineHeight" data-value="normal"
                    class="${this.settings.lineHeight === 'normal' ? 'active' : ''}">
              Normal
            </button>
            <button data-setting="lineHeight" data-value="relaxed"
                    class="${this.settings.lineHeight === 'relaxed' ? 'active' : ''}">
              Relaxed
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-setting]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const setting = btn.getAttribute('data-setting') as keyof ReaderSettings;
        const value = btn.getAttribute('data-value');

        if (setting && value) {
          this.update({ [setting]: value } as Partial<ReaderSettings>);

          // Update active states
          container
            .querySelectorAll(`[data-setting="${setting}"]`)
            .forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
  }
}
```

## Next Steps

With a functional reader interface, the next chapter adds text-to-speech—turning your reading library into an audio library.
