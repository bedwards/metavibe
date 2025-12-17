# Deployment and Sync

## Deployment Options

A personal reading library has unique deployment considerations:

- **Single user** - no multi-tenancy complexity
- **Always available** - you want your library accessible
- **Private data** - your reading habits are personal
- **Offline capable** - reading on planes, in subways

We'll cover three deployment approaches:

1. **Local only** - runs on your computer
2. **Self-hosted server** - VPS or home server
3. **Hybrid** - local with cloud sync

## Local Development Build

For local-only use, build and run:

```bash
# Build everything
npm run build

# Run with Node
node dist/api/index.js
```

Create a startup script:

```bash
#!/bin/bash
# start-library.sh

# Start database
docker-compose up -d db

# Wait for DB
sleep 3

# Start API
node dist/api/index.js &

# Open browser
open http://localhost:3000
```

## Docker Deployment

Package everything in Docker for portability:

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/api/index.js"]
```

Docker Compose for full stack:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://library:library@db:5432/reading_library
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: library
      POSTGRES_PASSWORD: library
      POSTGRES_DB: reading_library
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U library"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

Run with:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## VPS Deployment

For a dedicated server (DigitalOcean, Linode, Hetzner):

### Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Create app directory
mkdir -p ~/reading-library
cd ~/reading-library
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/library
server {
    listen 80;
    server_name library.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d library.yourdomain.com

# Auto-renewal is configured automatically
```

### Systemd Service

```ini
# /etc/systemd/system/reading-library.service
[Unit]
Description=Reading Library
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/user/reading-library
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable reading-library
sudo systemctl start reading-library
```

## Authentication

For a public server, add authentication:

```typescript
// src/api/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const API_KEY = process.env.API_KEY;

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip auth in development
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  // Check API key header
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || !API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Constant-time comparison
  const valid = crypto.timingSafeEqual(
    Buffer.from(apiKey as string),
    Buffer.from(API_KEY)
  );

  if (!valid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
```

Apply to routes:

```typescript
// src/api/index.ts
import { authMiddleware } from './middleware/auth.js';

// Apply to all API routes
app.use('/api', authMiddleware);
```

Generate a secure API key:

```bash
openssl rand -hex 32
```

## Offline Support with Service Worker

Make the app work offline:

```typescript
// web/src/sw.ts
const CACHE_NAME = 'reading-library-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.ts',
  '/src/styles/main.css',
];

// Install: cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // API requests: network first
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET responses
          if (event.request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: try cache
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({ error: 'Offline' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
```

Register the service worker:

```typescript
// web/src/main.ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => console.log('SW registered:', reg.scope))
    .catch((err) => console.error('SW registration failed:', err));
}
```

## IndexedDB for Offline Articles

Cache articles locally for offline reading:

```typescript
// web/src/services/offline-storage.ts

const DB_NAME = 'reading-library';
const DB_VERSION = 1;

interface OfflineArticle {
  id: string;
  title: string;
  content: string;
  textContent: string;
  savedAt: number;
}

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Articles store
        if (!db.objectStoreNames.contains('articles')) {
          const store = db.createObjectStore('articles', { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt');
        }

        // Progress store
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'articleId' });
        }
      };
    });
  }

  async saveArticle(article: OfflineArticle): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('articles', 'readwrite');
      const store = tx.objectStore('articles');

      const request = store.put({
        ...article,
        savedAt: Date.now(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getArticle(id: string): Promise<OfflineArticle | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('articles', 'readonly');
      const store = tx.objectStore('articles');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async getAllArticles(): Promise<OfflineArticle[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('articles', 'readonly');
      const store = tx.objectStore('articles');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteArticle(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('articles', 'readwrite');
      const store = tx.objectStore('articles');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveProgress(
    articleId: string,
    progress: { scrollPosition?: number; audioPosition?: number }
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('progress', 'readwrite');
      const store = tx.objectStore('progress');

      const request = store.put({
        articleId,
        ...progress,
        updatedAt: Date.now(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getProgress(
    articleId: string
  ): Promise<{ scrollPosition: number; audioPosition: number } | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('progress', 'readonly');
      const store = tx.objectStore('progress');
      const request = store.get(articleId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }
}

export const offlineStorage = new OfflineStorage();
```

## Sync Strategy

Sync local changes when back online:

```typescript
// web/src/services/sync-service.ts

import { offlineStorage } from './offline-storage.js';

interface SyncQueue {
  id: string;
  type: 'progress' | 'read' | 'favorite' | 'archive';
  articleId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export class SyncService {
  private queue: SyncQueue[] = [];
  private syncing = false;

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  private loadQueue(): void {
    const saved = localStorage.getItem('sync-queue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }

  private saveQueue(): void {
    localStorage.setItem('sync-queue', JSON.stringify(this.queue));
  }

  /**
   * Add action to sync queue
   */
  queueAction(
    type: SyncQueue['type'],
    articleId: string,
    data: Record<string, unknown>
  ): void {
    this.queue.push({
      id: crypto.randomUUID(),
      type,
      articleId,
      data,
      timestamp: Date.now(),
    });
    this.saveQueue();

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.sync();
    }
  }

  /**
   * Listen for online status changes
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('Back online, syncing...');
      this.sync();
    });
  }

  /**
   * Sync queued actions
   */
  async sync(): Promise<void> {
    if (this.syncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.syncing = true;

    try {
      const toSync = [...this.queue];

      for (const item of toSync) {
        try {
          await this.syncItem(item);
          // Remove from queue on success
          this.queue = this.queue.filter((q) => q.id !== item.id);
          this.saveQueue();
        } catch (error) {
          console.error('Sync failed for item:', item, error);
          // Keep in queue to retry later
        }
      }
    } finally {
      this.syncing = false;
    }
  }

  private async syncItem(item: SyncQueue): Promise<void> {
    switch (item.type) {
      case 'progress':
        await fetch(`/api/articles/${item.articleId}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        break;

      case 'read':
        await fetch(`/api/articles/${item.articleId}/read`, {
          method: 'POST',
        });
        break;

      case 'favorite':
        await fetch(`/api/articles/${item.articleId}/favorite`, {
          method: 'POST',
        });
        break;

      case 'archive':
        await fetch(`/api/articles/${item.articleId}/archive`, {
          method: 'POST',
        });
        break;
    }
  }

  /**
   * Get pending sync count
   */
  getPendingCount(): number {
    return this.queue.length;
  }
}

export const syncService = new SyncService();
```

## Backup Strategy

Regular backups are essential:

```typescript
// src/services/backup-service.ts
import { query } from '../db/client.js';
import fs from 'fs/promises';
import path from 'path';

export class BackupService {
  private backupDir: string;

  constructor(backupDir: string = './backups') {
    this.backupDir = backupDir;
  }

  /**
   * Create a full backup
   */
  async createBackup(): Promise<string> {
    await fs.mkdir(this.backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    // Export all data
    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      feeds: await query('SELECT * FROM feeds'),
      articles: await query('SELECT * FROM articles'),
      tags: await query('SELECT * FROM tags'),
      articleTags: await query('SELECT * FROM article_tags'),
      readingLists: await query('SELECT * FROM reading_lists'),
      readingListArticles: await query('SELECT * FROM reading_list_articles'),
      readingProgress: await query('SELECT * FROM reading_progress'),
    };

    await fs.writeFile(filepath, JSON.stringify(data, null, 2));

    return filepath;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(filepath: string): Promise<void> {
    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content);

    if (data.version !== 1) {
      throw new Error(`Unsupported backup version: ${data.version}`);
    }

    // Clear existing data
    await query('TRUNCATE reading_progress, reading_list_articles, reading_lists, article_tags, tags, articles, feeds CASCADE');

    // Restore in order (respecting foreign keys)
    for (const feed of data.feeds) {
      await query(
        `INSERT INTO feeds (id, url, title, description, site_url, favicon_url, last_fetched_at, fetch_error, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [feed.id, feed.url, feed.title, feed.description, feed.site_url, feed.favicon_url, feed.last_fetched_at, feed.fetch_error, feed.is_active, feed.created_at, feed.updated_at]
      );
    }

    for (const article of data.articles) {
      await query(
        `INSERT INTO articles (id, feed_id, url, title, author, published_at, content, text_content, excerpt, word_count, reading_time_minutes, image_url, is_read, is_archived, is_favorite, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [article.id, article.feed_id, article.url, article.title, article.author, article.published_at, article.content, article.text_content, article.excerpt, article.word_count, article.reading_time_minutes, article.image_url, article.is_read, article.is_archived, article.is_favorite, article.created_at, article.updated_at]
      );
    }

    for (const tag of data.tags) {
      await query(
        `INSERT INTO tags (id, name, color, created_at) VALUES ($1, $2, $3, $4)`,
        [tag.id, tag.name, tag.color, tag.created_at]
      );
    }

    for (const at of data.articleTags) {
      await query(
        `INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)`,
        [at.article_id, at.tag_id]
      );
    }

    for (const list of data.readingLists) {
      await query(
        `INSERT INTO reading_lists (id, name, description, is_default, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [list.id, list.name, list.description, list.is_default, list.position, list.created_at, list.updated_at]
      );
    }

    for (const rla of data.readingListArticles) {
      await query(
        `INSERT INTO reading_list_articles (reading_list_id, article_id, position, added_at)
         VALUES ($1, $2, $3, $4)`,
        [rla.reading_list_id, rla.article_id, rla.position, rla.added_at]
      );
    }

    for (const progress of data.readingProgress) {
      await query(
        `INSERT INTO reading_progress (id, article_id, scroll_position, audio_position, last_read_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [progress.id, progress.article_id, progress.scroll_position, progress.audio_position, progress.last_read_at]
      );
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{ filename: string; size: number; created: Date }>> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('backup-') && file.endsWith('.json')) {
          const stat = await fs.stat(path.join(this.backupDir, file));
          backups.push({
            filename: file,
            size: stat.size,
            created: stat.mtime,
          });
        }
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch {
      return [];
    }
  }

  /**
   * Delete old backups (keep last N)
   */
  async pruneBackups(keepCount: number = 10): Promise<number> {
    const backups = await this.listBackups();
    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      await fs.unlink(path.join(this.backupDir, backup.filename));
    }

    return toDelete.length;
  }
}

export const backupService = new BackupService();
```

## Scheduled Backups

Add backup to the scheduler:

```typescript
// src/services/scheduler-service.ts (extended)

import { backupService } from './backup-service.js';

export class SchedulerService {
  // ... existing code ...

  /**
   * Start backup scheduler
   */
  startBackupScheduler(intervalHours: number = 24): void {
    // Run immediately
    this.runBackup();

    // Then on interval
    setInterval(
      () => this.runBackup(),
      intervalHours * 60 * 60 * 1000
    );
  }

  private async runBackup(): Promise<void> {
    try {
      console.log('Creating backup...');
      const filepath = await backupService.createBackup();
      console.log(`Backup created: ${filepath}`);

      // Prune old backups
      const deleted = await backupService.pruneBackups(10);
      if (deleted > 0) {
        console.log(`Pruned ${deleted} old backups`);
      }
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }
}
```

## Backup API

```typescript
// src/api/routes/backup.ts
import { Router } from 'express';
import { backupService } from '../../services/backup-service.js';

export const backupRouter = Router();

// List backups
backupRouter.get('/', async (_req, res, next) => {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (error) {
    next(error);
  }
});

// Create backup
backupRouter.post('/', async (_req, res, next) => {
  try {
    const filepath = await backupService.createBackup();
    res.json({ filepath });
  } catch (error) {
    next(error);
  }
});

// Download backup
backupRouter.get('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Validate filename
    if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
      res.status(400).json({ error: 'Invalid backup filename' });
      return;
    }

    res.download(`./backups/${filename}`);
  } catch (error) {
    next(error);
  }
});
```

## Final Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (PWA)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │  Reader UI  │  │  TTS Player │  │    Offline Storage       │ │
│  │             │  │             │  │    (IndexedDB)           │ │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘ │
│                              │                                   │
│                    Service Worker (Cache)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                         HTTPS/WSS
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        Server                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Express API                          │   │
│  │  /feeds  /articles  /tags  /search  /tts  /backup       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐   │
│  │ Feed Service│  │  TTS Service│  │   Backup Service     │   │
│  │  (Scheduler)│  │ (Speechify) │  │                      │   │
│  └─────────────┘  └─────────────┘  └──────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## What You've Built

A complete personal reading library with:

- **RSS feed management** - Subscribe, fetch, organize
- **Content extraction** - Clean articles from any URL
- **Beautiful reader** - Typography, dark mode, progress tracking
- **Text-to-speech** - Browser native + premium services
- **Organization** - Tags, reading lists, full-text search
- **Offline support** - Service worker + IndexedDB
- **Self-hosted** - Docker deployment, backups

## Going Further

Ideas for extending your library:

- **Browser extension** - Save articles from any page
- **Email integration** - Forward newsletters to your library
- **Pocket/Instapaper import** - Migrate existing collections
- **Kindle export** - Send articles to your e-reader
- **Social features** - Share reading lists with friends
- **AI summaries** - Generate article summaries with Claude
- **Spaced repetition** - Review highlights and notes

The foundation is solid. Build what you need.
