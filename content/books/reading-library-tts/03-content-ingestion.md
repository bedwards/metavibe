# Content Ingestion and Storage

## The Problem with Web Content

RSS feeds give you metadata and maybe a preview, but rarely the full article. You need to fetch the original URL and extract the content.

This is harder than it sounds. Web pages are cluttered:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 50 meta tags -->
  <!-- 20 script tags -->
  <!-- Analytics, tracking pixels -->
</head>
<body>
  <header><!-- Navigation, logo, search --></header>
  <aside><!-- Author bio, related posts --></aside>
  <main>
    <article>
      <!-- The actual content you want -->
      <h1>Article Title</h1>
      <p>The content...</p>
      <!-- But also: newsletter signup forms, social buttons -->
    </article>
  </main>
  <footer><!-- Links, copyright --></footer>
  <!-- More scripts, chat widgets -->
</body>
</html>
```

You want the `<article>` content, cleaned of cruft. Mozilla's Readability algorithm does exactly this—it's what Firefox's Reader View uses.

## Mozilla Readability

Readability analyzes page structure and extracts the main content:

```typescript
// src/services/readability-service.ts
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ExtractedContent {
  title: string;
  content: string;        // Clean HTML
  textContent: string;    // Plain text
  excerpt: string | null;
  byline: string | null;
  siteName: string | null;
  length: number;         // Character count
}

export class ReadabilityService {
  /**
   * Extract article content from URL
   */
  async extract(url: string): Promise<ExtractedContent> {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ReadingLibrary/1.0; +http://localhost)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    return this.extractFromHtml(html, url);
  }

  /**
   * Extract article content from HTML string
   */
  extractFromHtml(html: string, url: string): ExtractedContent {
    // Parse HTML
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Run Readability
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Could not extract article content');
    }

    return {
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      excerpt: article.excerpt,
      byline: article.byline,
      siteName: article.siteName,
      length: article.length,
    };
  }
}

export const readabilityService = new ReadabilityService();
```

## HTML Sanitization

Readability output is cleaner than the original page, but still contains HTML you might not want:

- Inline styles
- Data attributes
- Potentially dangerous elements

Sanitize before storage:

```typescript
// src/utils/html-cleaner.ts
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  // Structure
  'article', 'section', 'div', 'span',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Text
  'p', 'br', 'hr',
  // Formatting
  'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'small',
  'sub', 'sup',
  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // Links and media
  'a', 'img', 'figure', 'figcaption',
  // Quotes and code
  'blockquote', 'pre', 'code', 'kbd',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  '*': ['id', 'class'],
};

export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // Open links in new tab
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      // Lazy load images
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          loading: 'lazy',
        },
      }),
    },
  });
}

/**
 * Extract plain text from HTML
 * Better than Readability's textContent for TTS
 */
export function htmlToText(html: string): string {
  // Remove tags but preserve structure
  let text = html
    // Add newlines for block elements
    .replace(/<\/(p|div|h[1-6]|li|blockquote|br|hr)[^>]*>/gi, '\n')
    .replace(/<(p|div|h[1-6]|li|blockquote|br|hr)[^>]*>/gi, '\n')
    // Remove all other tags
    .replace(/<[^>]+>/g, '')
    // Decode entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Clean text specifically for TTS
 * Removes elements that sound bad when spoken
 */
export function cleanForTts(text: string): string {
  return text
    // Remove URLs (they sound terrible spoken)
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove email addresses
    .replace(/[^\s]+@[^\s]+\.[^\s]+/g, '')
    // Remove excessive punctuation
    .replace(/[.]{2,}/g, '.')
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    // Remove code blocks (usually not readable)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
```

## The Article Service

Combining extraction, cleaning, and storage:

```typescript
// src/services/article-service.ts
import { query, queryOne, execute } from '../db/client.js';
import { readabilityService } from './readability-service.js';
import { cleanHtml, htmlToText } from '../utils/html-cleaner.js';
import type { Article, ArticleWithTags, Tag } from '../types/index.js';

export class ArticleService {
  /**
   * Ingest an article from URL
   * Returns the article if created, null if already exists
   */
  async ingestArticle(
    url: string,
    feedId?: string
  ): Promise<Article | null> {
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);

    // Check for existing article
    const existing = await queryOne<Article>(
      'SELECT * FROM articles WHERE url = $1',
      [normalizedUrl]
    );

    if (existing) {
      return null; // Already have this article
    }

    // Extract content
    const extracted = await readabilityService.extract(normalizedUrl);

    // Clean HTML and extract text
    const content = cleanHtml(extracted.content);
    const textContent = htmlToText(extracted.content);

    // Calculate reading time (average 200 words per minute)
    const wordCount = textContent.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    // Insert article
    const article = await queryOne<Article>(
      `INSERT INTO articles (
         feed_id, url, title, author, content, text_content,
         excerpt, word_count, reading_time_minutes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        feedId ?? null,
        normalizedUrl,
        extracted.title,
        extracted.byline,
        content,
        textContent,
        extracted.excerpt,
        wordCount,
        readingTimeMinutes,
      ]
    );

    return article;
  }

  /**
   * Get article by ID with tags
   */
  async getArticle(id: string): Promise<ArticleWithTags | null> {
    const article = await queryOne<Article>(
      'SELECT * FROM articles WHERE id = $1',
      [id]
    );

    if (!article) return null;

    const tags = await query<Tag>(
      `SELECT t.* FROM tags t
       JOIN article_tags at ON at.tag_id = t.id
       WHERE at.article_id = $1
       ORDER BY t.name`,
      [id]
    );

    return { ...article, tags };
  }

  /**
   * List articles with pagination and filters
   */
  async listArticles(options: {
    feedId?: string;
    tagId?: string;
    isRead?: boolean;
    isArchived?: boolean;
    isFavorite?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ articles: ArticleWithTags[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause
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

    if (options.isRead !== undefined) {
      conditions.push(`a.is_read = $${paramIndex++}`);
      params.push(options.isRead);
    }

    if (options.isArchived !== undefined) {
      conditions.push(`a.is_archived = $${paramIndex++}`);
      params.push(options.isArchived);
    }

    if (options.isFavorite !== undefined) {
      conditions.push(`a.is_favorite = $${paramIndex++}`);
      params.push(options.isFavorite);
    }

    if (options.search) {
      conditions.push(
        `to_tsvector('english', a.title || ' ' || a.text_content) @@ plainto_tsquery('english', $${paramIndex++})`
      );
      params.push(options.search);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM articles a ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count ?? '0', 10);

    // Get articles with pagination
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const articles = await query<Article>(
      `SELECT a.* FROM articles a
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    // Get tags for all articles
    const articleIds = articles.map((a) => a.id);

    if (articleIds.length === 0) {
      return { articles: [], total };
    }

    const tagRows = await query<{ article_id: string } & Tag>(
      `SELECT at.article_id, t.*
       FROM tags t
       JOIN article_tags at ON at.tag_id = t.id
       WHERE at.article_id = ANY($1)
       ORDER BY t.name`,
      [articleIds]
    );

    // Group tags by article
    const tagsByArticle = new Map<string, Tag[]>();
    for (const row of tagRows) {
      const { article_id, ...tag } = row;
      if (!tagsByArticle.has(article_id)) {
        tagsByArticle.set(article_id, []);
      }
      tagsByArticle.get(article_id)!.push(tag);
    }

    const articlesWithTags: ArticleWithTags[] = articles.map((article) => ({
      ...article,
      tags: tagsByArticle.get(article.id) ?? [],
    }));

    return { articles: articlesWithTags, total };
  }

  /**
   * Update article properties
   */
  async updateArticle(
    id: string,
    updates: {
      isRead?: boolean;
      isArchived?: boolean;
      isFavorite?: boolean;
    }
  ): Promise<Article | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.isRead !== undefined) {
      setClauses.push(`is_read = $${paramIndex++}`);
      params.push(updates.isRead);
    }

    if (updates.isArchived !== undefined) {
      setClauses.push(`is_archived = $${paramIndex++}`);
      params.push(updates.isArchived);
    }

    if (updates.isFavorite !== undefined) {
      setClauses.push(`is_favorite = $${paramIndex++}`);
      params.push(updates.isFavorite);
    }

    if (setClauses.length === 0) {
      return this.getArticle(id);
    }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    return queryOne<Article>(
      `UPDATE articles
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );
  }

  /**
   * Add tags to article
   */
  async addTags(articleId: string, tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      await execute(
        `INSERT INTO article_tags (article_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [articleId, tagId]
      );
    }
  }

  /**
   * Remove tags from article
   */
  async removeTags(articleId: string, tagIds: string[]): Promise<void> {
    await execute(
      `DELETE FROM article_tags
       WHERE article_id = $1 AND tag_id = ANY($2)`,
      [articleId, tagIds]
    );
  }

  /**
   * Delete article permanently
   */
  async deleteArticle(id: string): Promise<void> {
    await execute('DELETE FROM articles WHERE id = $1', [id]);
  }

  private normalizeUrl(url: string): string {
    const parsed = new URL(url);
    // Remove tracking parameters
    const cleanParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'];
    for (const param of cleanParams) {
      parsed.searchParams.delete(param);
    }
    return parsed.href;
  }
}

export const articleService = new ArticleService();
```

## Content Deduplication

Duplicate detection beyond URL matching:

```typescript
// src/services/deduplication-service.ts
import { query, queryOne } from '../db/client.js';
import type { Article } from '../types/index.js';

export class DeduplicationService {
  /**
   * Check if similar article already exists
   */
  async findSimilar(
    title: string,
    textContent: string
  ): Promise<Article | null> {
    // First, check for exact title match
    const exactMatch = await queryOne<Article>(
      `SELECT * FROM articles
       WHERE LOWER(title) = LOWER($1)
       LIMIT 1`,
      [title]
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Check for similar content using trigram similarity
    // Requires pg_trgm extension
    const similarContent = await queryOne<Article>(
      `SELECT *,
              similarity(text_content, $1) as sim
       FROM articles
       WHERE similarity(text_content, $1) > 0.7
       ORDER BY sim DESC
       LIMIT 1`,
      [textContent.slice(0, 10000)] // First 10k chars for comparison
    );

    return similarContent;
  }

  /**
   * Generate content fingerprint for deduplication
   */
  generateFingerprint(text: string): string {
    // Simple approach: hash of normalized text
    const normalized = text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();

    // Use first 1000 chars for fingerprint
    const sample = normalized.slice(0, 1000);

    // Simple hash (for production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(16);
  }
}

export const deduplicationService = new DeduplicationService();
```

## Article API Routes

```typescript
// src/api/routes/articles.ts
import { Router } from 'express';
import { articleService } from '../../services/article-service.js';
import { AppError } from '../middleware/error.js';

export const articlesRouter = Router();

// List articles
articlesRouter.get('/', async (req, res, next) => {
  try {
    const {
      feedId,
      tagId,
      isRead,
      isArchived,
      isFavorite,
      search,
      limit,
      offset,
    } = req.query;

    const result = await articleService.listArticles({
      feedId: feedId as string | undefined,
      tagId: tagId as string | undefined,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      isArchived:
        isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
      isFavorite:
        isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Add article from URL
articlesRouter.post('/', async (req, res, next) => {
  try {
    const { url, feedId } = req.body as { url?: string; feedId?: string };

    if (!url) {
      throw new AppError(400, 'URL is required', 'MISSING_URL');
    }

    const article = await articleService.ingestArticle(url, feedId);

    if (!article) {
      throw new AppError(409, 'Article already exists', 'DUPLICATE_ARTICLE');
    }

    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
});

// Get single article
articlesRouter.get('/:id', async (req, res, next) => {
  try {
    const article = await articleService.getArticle(req.params.id);

    if (!article) {
      throw new AppError(404, 'Article not found', 'ARTICLE_NOT_FOUND');
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
});

// Update article
articlesRouter.patch('/:id', async (req, res, next) => {
  try {
    const { isRead, isArchived, isFavorite } = req.body;

    const article = await articleService.updateArticle(req.params.id, {
      isRead,
      isArchived,
      isFavorite,
    });

    if (!article) {
      throw new AppError(404, 'Article not found', 'ARTICLE_NOT_FOUND');
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
});

// Mark as read
articlesRouter.post('/:id/read', async (req, res, next) => {
  try {
    const article = await articleService.updateArticle(req.params.id, {
      isRead: true,
    });

    if (!article) {
      throw new AppError(404, 'Article not found', 'ARTICLE_NOT_FOUND');
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
});

// Toggle favorite
articlesRouter.post('/:id/favorite', async (req, res, next) => {
  try {
    const current = await articleService.getArticle(req.params.id);

    if (!current) {
      throw new AppError(404, 'Article not found', 'ARTICLE_NOT_FOUND');
    }

    const article = await articleService.updateArticle(req.params.id, {
      isFavorite: !current.isFavorite,
    });

    res.json(article);
  } catch (error) {
    next(error);
  }
});

// Archive article
articlesRouter.post('/:id/archive', async (req, res, next) => {
  try {
    const article = await articleService.updateArticle(req.params.id, {
      isArchived: true,
    });

    if (!article) {
      throw new AppError(404, 'Article not found', 'ARTICLE_NOT_FOUND');
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
});

// Manage tags
articlesRouter.post('/:id/tags', async (req, res, next) => {
  try {
    const { tagIds } = req.body as { tagIds?: string[] };

    if (!tagIds || !Array.isArray(tagIds)) {
      throw new AppError(400, 'tagIds array required', 'MISSING_TAG_IDS');
    }

    await articleService.addTags(req.params.id, tagIds);
    const article = await articleService.getArticle(req.params.id);

    res.json(article);
  } catch (error) {
    next(error);
  }
});

articlesRouter.delete('/:id/tags', async (req, res, next) => {
  try {
    const { tagIds } = req.body as { tagIds?: string[] };

    if (!tagIds || !Array.isArray(tagIds)) {
      throw new AppError(400, 'tagIds array required', 'MISSING_TAG_IDS');
    }

    await articleService.removeTags(req.params.id, tagIds);
    const article = await articleService.getArticle(req.params.id);

    res.json(article);
  } catch (error) {
    next(error);
  }
});

// Delete article
articlesRouter.delete('/:id', async (req, res, next) => {
  try {
    await articleService.deleteArticle(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

## Handling Edge Cases

Real-world content extraction faces many challenges:

```typescript
// src/services/readability-service.ts (extended)

export class ReadabilityService {
  // ... previous methods ...

  /**
   * Handle sites that need special treatment
   */
  async extractWithFallbacks(url: string): Promise<ExtractedContent> {
    const hostname = new URL(url).hostname;

    // Substack-specific handling
    if (hostname.includes('substack.com')) {
      return this.extractSubstack(url);
    }

    // Medium-specific handling
    if (hostname.includes('medium.com')) {
      return this.extractMedium(url);
    }

    // Default extraction
    try {
      return await this.extract(url);
    } catch (error) {
      // Try with different headers (some sites block bots)
      return this.extractWithBrowserHeaders(url);
    }
  }

  private async extractSubstack(url: string): Promise<ExtractedContent> {
    // Substack serves clean content if you request the right format
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    const html = await response.text();
    return this.extractFromHtml(html, url);
  }

  private async extractMedium(url: string): Promise<ExtractedContent> {
    // Medium requires specific handling due to their paywall
    // This works for free articles
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
        // Don't send cookies to avoid metered paywall
      },
      credentials: 'omit',
    });

    const html = await response.text();
    return this.extractFromHtml(html, url);
  }

  private async extractWithBrowserHeaders(
    url: string
  ): Promise<ExtractedContent> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    const html = await response.text();
    return this.extractFromHtml(html, url);
  }
}
```

## Metadata Extraction

Extract additional metadata beyond Readability:

```typescript
// src/utils/metadata-extractor.ts
import { JSDOM } from 'jsdom';

export interface ArticleMetadata {
  title: string | null;
  description: string | null;
  author: string | null;
  publishedAt: Date | null;
  imageUrl: string | null;
  siteName: string | null;
  canonicalUrl: string | null;
}

export function extractMetadata(html: string, url: string): ArticleMetadata {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  return {
    title: getMetaContent(document, [
      'og:title',
      'twitter:title',
      'title',
    ]) ?? document.title ?? null,

    description: getMetaContent(document, [
      'og:description',
      'twitter:description',
      'description',
    ]),

    author: getMetaContent(document, [
      'author',
      'article:author',
      'twitter:creator',
    ]) ?? getJsonLdAuthor(document),

    publishedAt: parsePublishedDate(document),

    imageUrl: getMetaContent(document, [
      'og:image',
      'twitter:image',
      'twitter:image:src',
    ]),

    siteName: getMetaContent(document, ['og:site_name']),

    canonicalUrl:
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
      null,
  };
}

function getMetaContent(
  document: Document,
  names: string[]
): string | null {
  for (const name of names) {
    // Try name attribute
    const byName = document.querySelector(`meta[name="${name}"]`);
    if (byName) {
      return byName.getAttribute('content');
    }

    // Try property attribute (OpenGraph)
    const byProperty = document.querySelector(`meta[property="${name}"]`);
    if (byProperty) {
      return byProperty.getAttribute('content');
    }
  }
  return null;
}

function getJsonLdAuthor(document: Document): string | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '');

      if (data.author) {
        if (typeof data.author === 'string') {
          return data.author;
        }
        if (data.author.name) {
          return data.author.name;
        }
      }
    } catch {
      // Invalid JSON, continue
    }
  }

  return null;
}

function parsePublishedDate(document: Document): Date | null {
  // Try meta tags
  const dateStr = getMetaContent(document, [
    'article:published_time',
    'datePublished',
    'date',
    'DC.date.issued',
  ]);

  if (dateStr) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '');

      if (data.datePublished) {
        const date = new Date(data.datePublished);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch {
      // Invalid JSON, continue
    }
  }

  // Try time element
  const time = document.querySelector('time[datetime]');
  if (time) {
    const datetime = time.getAttribute('datetime');
    if (datetime) {
      const date = new Date(datetime);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}
```

## Next Steps

With content ingestion working, we can now build the reader interface—displaying articles with clean typography, dark mode, and reading progress tracking.
