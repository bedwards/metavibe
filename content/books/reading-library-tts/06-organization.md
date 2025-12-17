# Organization and Search

## The Organization Challenge

A reading library grows quickly. Subscribe to ten feeds, and you'll have hundreds of articles within weeks. Without organization, finding that article you half-remember becomes impossible.

We need:
- **Tags** for categorization
- **Reading lists** for curation
- **Full-text search** for discovery
- **Smart filters** for browsing

## Tag Management

Tags are the primary organization mechanism. Keep them simple: a name and a color.

```typescript
// src/services/tag-service.ts
import { query, queryOne, execute } from '../db/client.js';
import type { Tag } from '../types/index.js';

export class TagService {
  /**
   * Create a new tag
   */
  async createTag(name: string, color?: string): Promise<Tag> {
    const normalizedName = name.toLowerCase().trim();

    const tag = await queryOne<Tag>(
      `INSERT INTO tags (name, color)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [normalizedName, color ?? this.generateColor(normalizedName)]
    );

    if (!tag) {
      throw new Error('Failed to create tag');
    }

    return tag;
  }

  /**
   * Get all tags with usage counts
   */
  async getAllTags(): Promise<Array<Tag & { articleCount: number }>> {
    return query(
      `SELECT t.*, COUNT(at.article_id)::int as article_count
       FROM tags t
       LEFT JOIN article_tags at ON at.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name`
    );
  }

  /**
   * Get tag by ID
   */
  async getTag(id: string): Promise<Tag | null> {
    return queryOne<Tag>('SELECT * FROM tags WHERE id = $1', [id]);
  }

  /**
   * Update tag
   */
  async updateTag(
    id: string,
    updates: { name?: string; color?: string }
  ): Promise<Tag | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.name) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name.toLowerCase().trim());
    }

    if (updates.color) {
      setClauses.push(`color = $${paramIndex++}`);
      params.push(updates.color);
    }

    if (setClauses.length === 0) {
      return this.getTag(id);
    }

    params.push(id);

    return queryOne<Tag>(
      `UPDATE tags SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
  }

  /**
   * Delete tag
   */
  async deleteTag(id: string): Promise<void> {
    await execute('DELETE FROM tags WHERE id = $1', [id]);
  }

  /**
   * Generate a color from tag name (deterministic)
   */
  private generateColor(name: string): string {
    // Hash the name to get consistent colors
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to HSL for nice colors
    const h = hash % 360;
    const s = 50 + (hash % 30); // 50-80%
    const l = 40 + (hash % 20); // 40-60%

    return `hsl(${h}, ${s}%, ${l}%)`;
  }
}

export const tagService = new TagService();
```

## Auto-Tagging with AI

Use Claude to suggest tags based on content:

```typescript
// src/services/auto-tagger.ts
import Anthropic from '@anthropic-ai/sdk';
import { tagService } from './tag-service.js';
import { articleService } from './article-service.js';
import type { Tag } from '../types/index.js';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic()
  : null;

export class AutoTagger {
  /**
   * Suggest tags for an article
   */
  async suggestTags(articleId: string): Promise<string[]> {
    if (!anthropic) {
      return [];
    }

    const article = await articleService.getArticle(articleId);
    if (!article) return [];

    // Get existing tags for context
    const existingTags = await tagService.getAllTags();
    const tagNames = existingTags.map((t) => t.name);

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Suggest 2-4 tags for this article. Prefer existing tags when appropriate.

Existing tags: ${tagNames.join(', ')}

Article title: ${article.title}
Article excerpt: ${article.textContent.slice(0, 1000)}

Return only tag names, one per line, lowercase. Create new tags only if necessary.`,
        },
      ],
    });

    const text = response.content[0]?.type === 'text'
      ? response.content[0].text
      : '';

    return text
      .split('\n')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length < 30);
  }

  /**
   * Auto-tag an article
   */
  async autoTag(articleId: string): Promise<Tag[]> {
    const suggestions = await this.suggestTags(articleId);
    const appliedTags: Tag[] = [];

    for (const name of suggestions) {
      // Get or create tag
      let tag = (await tagService.getAllTags()).find(
        (t) => t.name === name
      );

      if (!tag) {
        tag = await tagService.createTag(name);
      }

      // Apply to article
      await articleService.addTags(articleId, [tag.id]);
      appliedTags.push(tag);
    }

    return appliedTags;
  }
}

export const autoTagger = new AutoTagger();
```

## Reading Lists

Reading lists are curated collections, like playlists for articles:

```typescript
// src/services/reading-list-service.ts
import { query, queryOne, execute } from '../db/client.js';
import type { ReadingList, Article } from '../types/index.js';

export interface ReadingListWithArticles extends ReadingList {
  articles: Article[];
  articleCount: number;
}

export class ReadingListService {
  /**
   * Create a new reading list
   */
  async createList(name: string, description?: string): Promise<ReadingList> {
    // Get max position
    const maxPos = await queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(position), 0) as max FROM reading_lists'
    );

    const list = await queryOne<ReadingList>(
      `INSERT INTO reading_lists (name, description, position)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description ?? null, (maxPos?.max ?? 0) + 1]
    );

    if (!list) {
      throw new Error('Failed to create reading list');
    }

    return list;
  }

  /**
   * Get all reading lists with article counts
   */
  async getAllLists(): Promise<Array<ReadingList & { articleCount: number }>> {
    return query(
      `SELECT rl.*, COUNT(rla.article_id)::int as article_count
       FROM reading_lists rl
       LEFT JOIN reading_list_articles rla ON rla.reading_list_id = rl.id
       GROUP BY rl.id
       ORDER BY rl.position`
    );
  }

  /**
   * Get reading list with articles
   */
  async getListWithArticles(id: string): Promise<ReadingListWithArticles | null> {
    const list = await queryOne<ReadingList>(
      'SELECT * FROM reading_lists WHERE id = $1',
      [id]
    );

    if (!list) return null;

    const articles = await query<Article>(
      `SELECT a.*
       FROM articles a
       JOIN reading_list_articles rla ON rla.article_id = a.id
       WHERE rla.reading_list_id = $1
       ORDER BY rla.position`,
      [id]
    );

    return {
      ...list,
      articles,
      articleCount: articles.length,
    };
  }

  /**
   * Add article to list
   */
  async addArticle(listId: string, articleId: string): Promise<void> {
    // Get max position in list
    const maxPos = await queryOne<{ max: number }>(
      `SELECT COALESCE(MAX(position), 0) as max
       FROM reading_list_articles
       WHERE reading_list_id = $1`,
      [listId]
    );

    await execute(
      `INSERT INTO reading_list_articles (reading_list_id, article_id, position)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [listId, articleId, (maxPos?.max ?? 0) + 1]
    );
  }

  /**
   * Remove article from list
   */
  async removeArticle(listId: string, articleId: string): Promise<void> {
    await execute(
      `DELETE FROM reading_list_articles
       WHERE reading_list_id = $1 AND article_id = $2`,
      [listId, articleId]
    );
  }

  /**
   * Reorder article in list
   */
  async reorderArticle(
    listId: string,
    articleId: string,
    newPosition: number
  ): Promise<void> {
    // Get current position
    const current = await queryOne<{ position: number }>(
      `SELECT position FROM reading_list_articles
       WHERE reading_list_id = $1 AND article_id = $2`,
      [listId, articleId]
    );

    if (!current) return;

    const oldPosition = current.position;

    if (newPosition > oldPosition) {
      // Moving down: shift items up
      await execute(
        `UPDATE reading_list_articles
         SET position = position - 1
         WHERE reading_list_id = $1
           AND position > $2
           AND position <= $3`,
        [listId, oldPosition, newPosition]
      );
    } else {
      // Moving up: shift items down
      await execute(
        `UPDATE reading_list_articles
         SET position = position + 1
         WHERE reading_list_id = $1
           AND position >= $2
           AND position < $3`,
        [listId, newPosition, oldPosition]
      );
    }

    // Update target position
    await execute(
      `UPDATE reading_list_articles
       SET position = $1
       WHERE reading_list_id = $2 AND article_id = $3`,
      [newPosition, listId, articleId]
    );
  }

  /**
   * Delete reading list
   */
  async deleteList(id: string): Promise<void> {
    await execute('DELETE FROM reading_lists WHERE id = $1', [id]);
  }

  /**
   * Update reading list
   */
  async updateList(
    id: string,
    updates: { name?: string; description?: string }
  ): Promise<ReadingList | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.name) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (setClauses.length === 0) return null;

    setClauses.push('updated_at = NOW()');
    params.push(id);

    return queryOne<ReadingList>(
      `UPDATE reading_lists SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
  }
}

export const readingListService = new ReadingListService();
```

## Full-Text Search

PostgreSQL's full-text search is powerful and fast:

```typescript
// src/services/search-service.ts
import { query } from '../db/client.js';
import type { Article } from '../types/index.js';

export interface SearchResult extends Article {
  rank: number;
  headline: string;
}

export class SearchService {
  /**
   * Search articles
   */
  async search(
    queryText: string,
    options: {
      feedId?: string;
      tagId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ results: SearchResult[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Full-text search condition
    conditions.push(
      `to_tsvector('english', a.title || ' ' || a.text_content) @@ plainto_tsquery('english', $${paramIndex++})`
    );
    params.push(queryText);

    // Optional filters
    if (options.feedId) {
      conditions.push(`a.feed_id = $${paramIndex++}`);
      params.push(options.feedId);
    }

    if (options.tagId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM article_tags at WHERE at.article_id = a.id AND at.tag_id = $${paramIndex++})`
      );
      params.push(options.tagId);
    }

    // Don't include archived by default
    conditions.push('NOT a.is_archived');

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM articles a
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count ?? '0', 10);

    // Get results with ranking and headlines
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const results = await query<SearchResult>(
      `SELECT a.*,
              ts_rank(
                to_tsvector('english', a.title || ' ' || a.text_content),
                plainto_tsquery('english', $1)
              ) as rank,
              ts_headline(
                'english',
                a.text_content,
                plainto_tsquery('english', $1),
                'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
              ) as headline
       FROM articles a
       WHERE ${whereClause}
       ORDER BY rank DESC, a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return { results, total };
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(prefix: string, limit = 10): Promise<string[]> {
    // Search titles starting with prefix
    const results = await query<{ title: string }>(
      `SELECT DISTINCT title
       FROM articles
       WHERE LOWER(title) LIKE LOWER($1 || '%')
       ORDER BY title
       LIMIT $2`,
      [prefix, limit]
    );

    return results.map((r) => r.title);
  }

  /**
   * Get related articles
   */
  async getRelated(articleId: string, limit = 5): Promise<Article[]> {
    // Find articles with similar content using full-text search
    return query<Article>(
      `WITH source AS (
         SELECT title, text_content FROM articles WHERE id = $1
       )
       SELECT a.*
       FROM articles a, source s
       WHERE a.id != $1
         AND NOT a.is_archived
         AND to_tsvector('english', a.title || ' ' || a.text_content) @@
             to_tsquery('english',
               regexp_replace(
                 regexp_replace(s.title, '[^a-zA-Z0-9\\s]', '', 'g'),
                 '\\s+',
                 ' | ',
                 'g'
               )
             )
       ORDER BY ts_rank(
         to_tsvector('english', a.title || ' ' || a.text_content),
         to_tsquery('english',
           regexp_replace(
             regexp_replace(s.title, '[^a-zA-Z0-9\\s]', '', 'g'),
             '\\s+',
             ' | ',
             'g'
           )
         )
       ) DESC
       LIMIT $2`,
      [articleId, limit]
    );
  }
}

export const searchService = new SearchService();
```

## Search API Routes

```typescript
// src/api/routes/search.ts
import { Router } from 'express';
import { searchService } from '../../services/search-service.js';
import { AppError } from '../middleware/error.js';

export const searchRouter = Router();

// Full-text search
searchRouter.get('/', async (req, res, next) => {
  try {
    const { q, feedId, tagId, limit, offset } = req.query;

    if (!q || typeof q !== 'string') {
      throw new AppError(400, 'Search query required', 'MISSING_QUERY');
    }

    const results = await searchService.search(q, {
      feedId: feedId as string | undefined,
      tagId: tagId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Autocomplete suggestions
searchRouter.get('/suggest', async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      res.json([]);
      return;
    }

    const suggestions = await searchService.getSuggestions(
      q,
      limit ? parseInt(limit as string, 10) : undefined
    );

    res.json(suggestions);
  } catch (error) {
    next(error);
  }
});

// Related articles
searchRouter.get('/related/:articleId', async (req, res, next) => {
  try {
    const { limit } = req.query;

    const related = await searchService.getRelated(
      req.params.articleId,
      limit ? parseInt(limit as string, 10) : undefined
    );

    res.json(related);
  } catch (error) {
    next(error);
  }
});
```

## Search UI Component

```typescript
// web/src/components/Search.ts

export class Search {
  private container: HTMLElement;
  private input: HTMLInputElement | null = null;
  private results: HTMLElement | null = null;
  private suggestions: HTMLElement | null = null;
  private searchTimeout: number | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container not found');
    this.container = container;

    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="search-container">
        <div class="search-input-wrapper">
          <input
            type="search"
            class="search-input"
            placeholder="Search articles..."
            autocomplete="off"
          />
          <div class="search-suggestions"></div>
        </div>
        <div class="search-results"></div>
      </div>
    `;

    this.input = this.container.querySelector('.search-input');
    this.results = this.container.querySelector('.search-results');
    this.suggestions = this.container.querySelector('.search-suggestions');
  }

  private setupEventListeners(): void {
    if (!this.input) return;

    // Input handler with debounce
    this.input.addEventListener('input', () => {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      const query = this.input?.value.trim();

      if (!query) {
        this.hideSuggestions();
        this.clearResults();
        return;
      }

      // Show suggestions after short delay
      this.searchTimeout = window.setTimeout(() => {
        this.fetchSuggestions(query);
      }, 150);
    });

    // Submit handler for full search
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.hideSuggestions();
        const query = this.input?.value.trim();
        if (query) {
          this.performSearch(query);
        }
      }

      if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    });

    // Click outside to close suggestions
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.hideSuggestions();
      }
    });
  }

  private async fetchSuggestions(query: string): Promise<void> {
    try {
      const response = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(query)}`
      );
      const suggestions = await response.json();
      this.showSuggestions(suggestions);
    } catch {
      this.hideSuggestions();
    }
  }

  private showSuggestions(items: string[]): void {
    if (!this.suggestions || items.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.suggestions.innerHTML = items
      .map(
        (item) => `
        <div class="suggestion-item" data-value="${this.escapeHtml(item)}">
          ${this.escapeHtml(item)}
        </div>
      `
      )
      .join('');

    this.suggestions.style.display = 'block';

    // Click handlers for suggestions
    this.suggestions.querySelectorAll('.suggestion-item').forEach((el) => {
      el.addEventListener('click', () => {
        const value = el.getAttribute('data-value');
        if (value && this.input) {
          this.input.value = value;
          this.hideSuggestions();
          this.performSearch(value);
        }
      });
    });
  }

  private hideSuggestions(): void {
    if (this.suggestions) {
      this.suggestions.style.display = 'none';
    }
  }

  private async performSearch(query: string): Promise<void> {
    if (!this.results) return;

    this.results.innerHTML = '<div class="search-loading">Searching...</div>';

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      this.renderResults(data.results, data.total);
    } catch {
      this.results.innerHTML =
        '<div class="search-error">Search failed. Please try again.</div>';
    }
  }

  private renderResults(
    results: Array<{
      id: string;
      title: string;
      headline: string;
      author: string | null;
      readingTimeMinutes: number;
    }>,
    total: number
  ): void {
    if (!this.results) return;

    if (results.length === 0) {
      this.results.innerHTML =
        '<div class="search-empty">No articles found.</div>';
      return;
    }

    this.results.innerHTML = `
      <div class="search-meta">${total} result${total === 1 ? '' : 's'}</div>
      <div class="search-items">
        ${results
          .map(
            (r) => `
          <article class="search-result" data-id="${r.id}">
            <h3 class="result-title">${this.escapeHtml(r.title)}</h3>
            <p class="result-headline">${r.headline}</p>
            <div class="result-meta">
              ${r.author ? `<span>${this.escapeHtml(r.author)}</span>` : ''}
              <span>${r.readingTimeMinutes} min read</span>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    `;

    // Click handlers
    this.results.querySelectorAll('.search-result').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) {
          window.location.href = `/read/${id}`;
        }
      });
    });
  }

  private clearResults(): void {
    if (this.results) {
      this.results.innerHTML = '';
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

## Search Styles

```css
/* styles/search.css */

.search-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-4);
}

.search-input-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: 1.125rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-link);
}

.search-suggestions {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.suggestion-item {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
}

.suggestion-item:hover {
  background: var(--color-bg-secondary);
}

.search-meta {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: var(--space-4) 0;
}

.search-result {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s;
}

.search-result:hover {
  background: var(--color-bg-secondary);
}

.result-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
}

.result-headline {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-2);
  line-height: 1.5;
}

.result-headline mark {
  background: var(--color-highlight);
  color: inherit;
  padding: 0 2px;
}

.result-meta {
  display: flex;
  gap: var(--space-3);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.search-loading,
.search-empty,
.search-error {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
}
```

## Tag and Reading List APIs

```typescript
// src/api/routes/tags.ts
import { Router } from 'express';
import { tagService } from '../../services/tag-service.js';
import { autoTagger } from '../../services/auto-tagger.js';
import { AppError } from '../middleware/error.js';

export const tagsRouter = Router();

tagsRouter.get('/', async (_req, res, next) => {
  try {
    const tags = await tagService.getAllTags();
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

tagsRouter.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      throw new AppError(400, 'Name required', 'MISSING_NAME');
    }

    const tag = await tagService.createTag(name, color);
    res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
});

tagsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const tag = await tagService.updateTag(req.params.id, { name, color });

    if (!tag) {
      throw new AppError(404, 'Tag not found', 'TAG_NOT_FOUND');
    }

    res.json(tag);
  } catch (error) {
    next(error);
  }
});

tagsRouter.delete('/:id', async (req, res, next) => {
  try {
    await tagService.deleteTag(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Auto-tag an article
tagsRouter.post('/auto/:articleId', async (req, res, next) => {
  try {
    const tags = await autoTagger.autoTag(req.params.articleId);
    res.json(tags);
  } catch (error) {
    next(error);
  }
});
```

```typescript
// src/api/routes/reading-lists.ts
import { Router } from 'express';
import { readingListService } from '../../services/reading-list-service.js';
import { AppError } from '../middleware/error.js';

export const readingListsRouter = Router();

readingListsRouter.get('/', async (_req, res, next) => {
  try {
    const lists = await readingListService.getAllLists();
    res.json(lists);
  } catch (error) {
    next(error);
  }
});

readingListsRouter.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      throw new AppError(400, 'Name required', 'MISSING_NAME');
    }

    const list = await readingListService.createList(name, description);
    res.status(201).json(list);
  } catch (error) {
    next(error);
  }
});

readingListsRouter.get('/:id', async (req, res, next) => {
  try {
    const list = await readingListService.getListWithArticles(req.params.id);

    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
});

readingListsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const list = await readingListService.updateList(req.params.id, {
      name,
      description,
    });

    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
});

readingListsRouter.delete('/:id', async (req, res, next) => {
  try {
    await readingListService.deleteList(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Add article to list
readingListsRouter.post('/:id/articles', async (req, res, next) => {
  try {
    const { articleId } = req.body;

    if (!articleId) {
      throw new AppError(400, 'articleId required', 'MISSING_ARTICLE_ID');
    }

    await readingListService.addArticle(req.params.id, articleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Remove article from list
readingListsRouter.delete('/:id/articles/:articleId', async (req, res, next) => {
  try {
    await readingListService.removeArticle(
      req.params.id,
      req.params.articleId
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Reorder article
readingListsRouter.post('/:id/reorder', async (req, res, next) => {
  try {
    const { articleId, position } = req.body;

    if (!articleId || position === undefined) {
      throw new AppError(400, 'articleId and position required', 'MISSING_PARAMS');
    }

    await readingListService.reorderArticle(req.params.id, articleId, position);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

## Next Steps

With organization in place, the final chapter covers deployment—self-hosting, cross-device sync, and backup strategies.
