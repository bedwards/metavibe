# Content Discovery with RSS

## Understanding RSS

RSS (Really Simple Syndication) is an XML format for content feeds. Every RSS feed contains:

- Channel metadata (title, description, link)
- A list of items (articles, posts, episodes)
- Per-item metadata (title, link, description, date, author)

Here's what a typical RSS feed looks like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Blog</title>
    <link>https://example.com</link>
    <description>Thoughts on technology</description>
    <item>
      <title>Building Better Software</title>
      <link>https://example.com/building-better-software</link>
      <description>Some thoughts on software quality...</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
      <author>author@example.com</author>
    </item>
  </channel>
</rss>
```

Atom is a similar format with slightly different structure. Most RSS libraries handle both transparently.

## The Feed Service

The feed service handles discovery, parsing, and storage:

```typescript
// src/services/feed-service.ts
import Parser from 'rss-parser';
import { query, queryOne, execute } from '../db/client.js';
import type { Feed, FeedWithStats } from '../types/index.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'ReadingLibrary/1.0',
  },
});

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
}

interface RSSFeed {
  title?: string;
  description?: string;
  link?: string;
  items: RSSItem[];
}

export class FeedService {
  /**
   * Add a new feed by URL
   */
  async addFeed(feedUrl: string): Promise<Feed> {
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(feedUrl);

    // Check if feed already exists
    const existing = await queryOne<Feed>(
      'SELECT * FROM feeds WHERE url = $1',
      [normalizedUrl]
    );

    if (existing) {
      return existing;
    }

    // Fetch and parse the feed to get metadata
    const feedData = await this.fetchFeed(normalizedUrl);

    // Insert the feed
    const feed = await queryOne<Feed>(
      `INSERT INTO feeds (url, title, description, site_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        normalizedUrl,
        feedData.title ?? 'Untitled Feed',
        feedData.description ?? null,
        feedData.link ?? null,
      ]
    );

    if (!feed) {
      throw new Error('Failed to create feed');
    }

    return feed;
  }

  /**
   * Fetch and parse an RSS feed
   */
  async fetchFeed(url: string): Promise<RSSFeed> {
    try {
      const feed = await parser.parseURL(url);
      return {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        items: feed.items,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch feed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refresh a feed and return new items
   */
  async refreshFeed(feedId: string): Promise<RSSItem[]> {
    const feed = await queryOne<Feed>(
      'SELECT * FROM feeds WHERE id = $1',
      [feedId]
    );

    if (!feed) {
      throw new Error('Feed not found');
    }

    try {
      const feedData = await this.fetchFeed(feed.url);

      // Update feed metadata
      await execute(
        `UPDATE feeds
         SET title = $1,
             description = $2,
             site_url = $3,
             last_fetched_at = NOW(),
             fetch_error = NULL,
             updated_at = NOW()
         WHERE id = $4`,
        [
          feedData.title ?? feed.title,
          feedData.description ?? feed.description,
          feedData.link ?? feed.siteUrl,
          feedId,
        ]
      );

      return feedData.items;
    } catch (error) {
      // Record the error but don't throw
      await execute(
        `UPDATE feeds
         SET fetch_error = $1,
             last_fetched_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [
          error instanceof Error ? error.message : 'Unknown error',
          feedId,
        ]
      );

      return [];
    }
  }

  /**
   * Get all feeds with article stats
   */
  async getAllFeeds(): Promise<FeedWithStats[]> {
    return query<FeedWithStats>(
      `SELECT
         f.*,
         COUNT(a.id)::int AS article_count,
         COUNT(a.id) FILTER (WHERE NOT a.is_read)::int AS unread_count
       FROM feeds f
       LEFT JOIN articles a ON a.feed_id = f.id AND NOT a.is_archived
       WHERE f.is_active
       GROUP BY f.id
       ORDER BY f.title`
    );
  }

  /**
   * Get a single feed by ID
   */
  async getFeed(feedId: string): Promise<Feed | null> {
    return queryOne<Feed>(
      'SELECT * FROM feeds WHERE id = $1',
      [feedId]
    );
  }

  /**
   * Delete a feed (articles are preserved with null feed_id)
   */
  async deleteFeed(feedId: string): Promise<void> {
    await execute(
      'DELETE FROM feeds WHERE id = $1',
      [feedId]
    );
  }

  /**
   * Toggle feed active status
   */
  async toggleFeedActive(feedId: string): Promise<Feed | null> {
    return queryOne<Feed>(
      `UPDATE feeds
       SET is_active = NOT is_active,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [feedId]
    );
  }

  /**
   * Normalize a feed URL
   */
  private normalizeUrl(url: string): string {
    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Parse and reconstruct
    const parsed = new URL(url);
    return parsed.href;
  }
}

export const feedService = new FeedService();
```

## Discovering Substack Feeds

Substack publications all follow the same pattern:

```
https://[publication].substack.com/feed
```

We can auto-discover feeds from Substack URLs:

```typescript
// src/services/feed-discovery.ts

export interface DiscoveredFeed {
  url: string;
  title: string;
  type: 'rss' | 'atom' | 'substack';
}

export class FeedDiscoveryService {
  /**
   * Discover RSS feeds from a URL
   */
  async discoverFeeds(url: string): Promise<DiscoveredFeed[]> {
    const normalizedUrl = this.normalizeUrl(url);
    const discovered: DiscoveredFeed[] = [];

    // Check for Substack
    if (this.isSubstackUrl(normalizedUrl)) {
      const substackFeed = this.getSubstackFeed(normalizedUrl);
      if (substackFeed) {
        discovered.push(substackFeed);
      }
    }

    // Check for common feed paths
    const commonPaths = [
      '/feed',
      '/feed/',
      '/rss',
      '/rss/',
      '/atom.xml',
      '/feed.xml',
      '/rss.xml',
      '/index.xml',
    ];

    const baseUrl = new URL(normalizedUrl).origin;

    for (const path of commonPaths) {
      const feedUrl = baseUrl + path;
      if (await this.isValidFeed(feedUrl)) {
        discovered.push({
          url: feedUrl,
          title: await this.getFeedTitle(feedUrl),
          type: path.includes('atom') ? 'atom' : 'rss',
        });
        break; // Found a feed, stop searching
      }
    }

    // Try to find feed links in HTML
    if (discovered.length === 0) {
      const htmlFeeds = await this.discoverFromHtml(normalizedUrl);
      discovered.push(...htmlFeeds);
    }

    return discovered;
  }

  /**
   * Check if URL is a Substack publication
   */
  private isSubstackUrl(url: string): boolean {
    return url.includes('.substack.com') || url.includes('substack.com/@');
  }

  /**
   * Get feed URL for a Substack publication
   */
  private getSubstackFeed(url: string): DiscoveredFeed | null {
    const parsed = new URL(url);

    // Format: publication.substack.com
    if (parsed.hostname.endsWith('.substack.com')) {
      return {
        url: `${parsed.origin}/feed`,
        title: parsed.hostname.replace('.substack.com', ''),
        type: 'substack',
      };
    }

    // Format: substack.com/@publication
    const atMatch = parsed.pathname.match(/^\/@([^/]+)/);
    if (atMatch?.[1]) {
      return {
        url: `https://${atMatch[1]}.substack.com/feed`,
        title: atMatch[1],
        type: 'substack',
      };
    }

    return null;
  }

  /**
   * Check if URL returns a valid RSS/Atom feed
   */
  private async isValidFeed(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'ReadingLibrary/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      const contentType = response.headers.get('content-type') ?? '';
      return (
        contentType.includes('xml') ||
        contentType.includes('rss') ||
        contentType.includes('atom')
      );
    } catch {
      return false;
    }
  }

  /**
   * Get feed title from URL
   */
  private async getFeedTitle(url: string): Promise<string> {
    try {
      const Parser = (await import('rss-parser')).default;
      const parser = new Parser({ timeout: 5000 });
      const feed = await parser.parseURL(url);
      return feed.title ?? 'Untitled Feed';
    } catch {
      return new URL(url).hostname;
    }
  }

  /**
   * Discover feeds from HTML page link tags
   */
  private async discoverFromHtml(url: string): Promise<DiscoveredFeed[]> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ReadingLibrary/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      const html = await response.text();
      const discovered: DiscoveredFeed[] = [];

      // Find <link> tags with RSS/Atom types
      const linkRegex =
        /<link[^>]+type=["'](application\/(rss|atom)\+xml)["'][^>]*>/gi;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const linkTag = match[0];

        // Extract href
        const hrefMatch = linkTag.match(/href=["']([^"']+)["']/);
        if (!hrefMatch?.[1]) continue;

        let feedUrl = hrefMatch[1];

        // Handle relative URLs
        if (!feedUrl.startsWith('http')) {
          feedUrl = new URL(feedUrl, url).href;
        }

        // Extract title
        const titleMatch = linkTag.match(/title=["']([^"']+)["']/);
        const title = titleMatch?.[1] ?? new URL(feedUrl).hostname;

        discovered.push({
          url: feedUrl,
          title,
          type: match[2] === 'atom' ? 'atom' : 'rss',
        });
      }

      return discovered;
    } catch {
      return [];
    }
  }

  private normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return new URL(url).href;
  }
}

export const feedDiscoveryService = new FeedDiscoveryService();
```

## Feed Management API

Expose feed operations via REST:

```typescript
// src/api/routes/feeds.ts
import { Router } from 'express';
import { feedService } from '../../services/feed-service.js';
import { feedDiscoveryService } from '../../services/feed-discovery.js';
import { AppError } from '../middleware/error.js';

export const feedsRouter = Router();

// Get all feeds
feedsRouter.get('/', async (_req, res, next) => {
  try {
    const feeds = await feedService.getAllFeeds();
    res.json(feeds);
  } catch (error) {
    next(error);
  }
});

// Add a new feed
feedsRouter.post('/', async (req, res, next) => {
  try {
    const { url } = req.body as { url?: string };

    if (!url) {
      throw new AppError(400, 'URL is required', 'MISSING_URL');
    }

    const feed = await feedService.addFeed(url);
    res.status(201).json(feed);
  } catch (error) {
    next(error);
  }
});

// Discover feeds from URL
feedsRouter.post('/discover', async (req, res, next) => {
  try {
    const { url } = req.body as { url?: string };

    if (!url) {
      throw new AppError(400, 'URL is required', 'MISSING_URL');
    }

    const feeds = await feedDiscoveryService.discoverFeeds(url);
    res.json(feeds);
  } catch (error) {
    next(error);
  }
});

// Get single feed
feedsRouter.get('/:id', async (req, res, next) => {
  try {
    const feed = await feedService.getFeed(req.params.id);

    if (!feed) {
      throw new AppError(404, 'Feed not found', 'FEED_NOT_FOUND');
    }

    res.json(feed);
  } catch (error) {
    next(error);
  }
});

// Refresh a feed
feedsRouter.post('/:id/refresh', async (req, res, next) => {
  try {
    const items = await feedService.refreshFeed(req.params.id);
    res.json({ itemCount: items.length, items });
  } catch (error) {
    next(error);
  }
});

// Toggle feed active status
feedsRouter.post('/:id/toggle', async (req, res, next) => {
  try {
    const feed = await feedService.toggleFeedActive(req.params.id);

    if (!feed) {
      throw new AppError(404, 'Feed not found', 'FEED_NOT_FOUND');
    }

    res.json(feed);
  } catch (error) {
    next(error);
  }
});

// Delete a feed
feedsRouter.delete('/:id', async (req, res, next) => {
  try {
    await feedService.deleteFeed(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

## Scheduled Feed Fetching

Background job to refresh feeds periodically:

```typescript
// src/services/scheduler-service.ts
import { query } from '../db/client.js';
import { feedService } from './feed-service.js';
import { articleService } from './article-service.js';
import type { Feed } from '../types/index.js';

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the scheduler
   */
  start(intervalMinutes: number = 30): void {
    if (this.intervalId) {
      console.log('Scheduler already running');
      return;
    }

    console.log(`Starting feed scheduler (interval: ${intervalMinutes}m)`);

    // Run immediately
    this.refreshAllFeeds();

    // Then run on interval
    this.intervalId = setInterval(
      () => this.refreshAllFeeds(),
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Feed scheduler stopped');
    }
  }

  /**
   * Refresh all active feeds
   */
  async refreshAllFeeds(): Promise<void> {
    if (this.isRunning) {
      console.log('Feed refresh already in progress, skipping');
      return;
    }

    this.isRunning = true;
    console.log('Starting feed refresh cycle');

    try {
      // Get all active feeds
      const feeds = await query<Feed>(
        'SELECT * FROM feeds WHERE is_active = true'
      );

      console.log(`Refreshing ${feeds.length} feeds`);

      let totalNewArticles = 0;

      for (const feed of feeds) {
        try {
          const items = await feedService.refreshFeed(feed.id);

          // Ingest new articles
          for (const item of items) {
            if (!item.link) continue;

            try {
              const created = await articleService.ingestArticle(
                item.link,
                feed.id
              );
              if (created) {
                totalNewArticles++;
              }
            } catch (error) {
              // Log but continue with other items
              console.error(
                `Error ingesting article ${item.link}:`,
                error instanceof Error ? error.message : error
              );
            }
          }
        } catch (error) {
          console.error(
            `Error refreshing feed ${feed.url}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      console.log(`Feed refresh complete. New articles: ${totalNewArticles}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.intervalId !== null;
  }
}

export const schedulerService = new SchedulerService();
```

Start the scheduler when the API starts:

```typescript
// src/api/index.ts (add at the end)
import { schedulerService } from '../services/scheduler-service.js';

// Start feed scheduler
const FEED_REFRESH_INTERVAL = parseInt(
  process.env.FEED_REFRESH_INTERVAL ?? '30',
  10
);
schedulerService.start(FEED_REFRESH_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  schedulerService.stop();
  process.exit(0);
});
```

## OPML Import/Export

OPML is the standard format for exchanging feed subscriptions:

```typescript
// src/services/opml-service.ts
import { query, queryOne, execute } from '../db/client.js';
import { feedService } from './feed-service.js';
import type { Feed } from '../types/index.js';

export class OpmlService {
  /**
   * Export feeds to OPML format
   */
  async exportOpml(): Promise<string> {
    const feeds = await query<Feed>(
      'SELECT * FROM feeds WHERE is_active = true ORDER BY title'
    );

    const items = feeds
      .map(
        (feed) =>
          `    <outline type="rss" text="${this.escapeXml(feed.title)}" ` +
          `title="${this.escapeXml(feed.title)}" ` +
          `xmlUrl="${this.escapeXml(feed.url)}"` +
          (feed.siteUrl ? ` htmlUrl="${this.escapeXml(feed.siteUrl)}"` : '') +
          '/>'
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Reading Library Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
${items}
  </body>
</opml>`;
  }

  /**
   * Import feeds from OPML
   */
  async importOpml(opmlContent: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Parse OPML - simple regex approach
    const outlineRegex = /<outline[^>]+xmlUrl=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = outlineRegex.exec(opmlContent)) !== null) {
      const feedUrl = this.unescapeXml(match[1]);

      try {
        // Check if already exists
        const existing = await queryOne<Feed>(
          'SELECT id FROM feeds WHERE url = $1',
          [feedUrl]
        );

        if (existing) {
          results.skipped++;
          continue;
        }

        await feedService.addFeed(feedUrl);
        results.imported++;
      } catch (error) {
        results.errors.push(
          `${feedUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private unescapeXml(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}

export const opmlService = new OpmlService();
```

## Feed Discovery UI Component

```typescript
// web/src/components/FeedDiscovery.ts

export class FeedDiscovery {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private results: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container not found');
    this.container = container;

    this.render();
    this.input = this.container.querySelector('input')!;
    this.results = this.container.querySelector('.results')!;

    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="feed-discovery">
        <form class="discovery-form">
          <input
            type="text"
            placeholder="Enter a blog URL or Substack publication..."
            autocomplete="off"
          />
          <button type="submit">Find Feeds</button>
        </form>
        <div class="results"></div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const form = this.container.querySelector('form')!;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.discover();
    });
  }

  private async discover(): Promise<void> {
    const url = this.input.value.trim();
    if (!url) return;

    this.results.innerHTML = '<div class="loading">Searching for feeds...</div>';

    try {
      const response = await fetch('/api/feeds/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Discovery failed');
      }

      const feeds = await response.json();
      this.renderResults(feeds);
    } catch (error) {
      this.results.innerHTML = `
        <div class="error">
          Could not find any feeds. Try entering the direct RSS URL.
        </div>
      `;
    }
  }

  private renderResults(feeds: Array<{
    url: string;
    title: string;
    type: string;
  }>): void {
    if (feeds.length === 0) {
      this.results.innerHTML = `
        <div class="no-results">
          No feeds found. Try entering the direct RSS URL.
        </div>
      `;
      return;
    }

    this.results.innerHTML = feeds
      .map(
        (feed) => `
        <div class="feed-result">
          <div class="feed-info">
            <span class="feed-title">${this.escapeHtml(feed.title)}</span>
            <span class="feed-type">${feed.type.toUpperCase()}</span>
          </div>
          <div class="feed-url">${this.escapeHtml(feed.url)}</div>
          <button class="subscribe-btn" data-url="${this.escapeHtml(feed.url)}">
            Subscribe
          </button>
        </div>
      `
      )
      .join('');

    // Add click handlers
    this.results.querySelectorAll('.subscribe-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const feedUrl = btn.getAttribute('data-url');
        if (feedUrl) {
          await this.subscribe(feedUrl, btn as HTMLButtonElement);
        }
      });
    });
  }

  private async subscribe(
    url: string,
    button: HTMLButtonElement
  ): Promise<void> {
    button.disabled = true;
    button.textContent = 'Adding...';

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to add feed');
      }

      button.textContent = 'Added!';
      button.classList.add('success');

      // Dispatch event for parent to handle
      this.container.dispatchEvent(
        new CustomEvent('feed-added', {
          detail: await response.json(),
        })
      );
    } catch (error) {
      button.textContent = 'Error';
      button.classList.add('error');
      setTimeout(() => {
        button.textContent = 'Subscribe';
        button.disabled = false;
        button.classList.remove('error');
      }, 2000);
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

## Next Steps

With feed discovery in place, the next chapter covers ingesting the actual article content—fetching full articles, cleaning HTML, and storing them in the database.
