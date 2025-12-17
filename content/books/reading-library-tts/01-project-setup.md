# Project Setup

## Architecture Overview

A reading library has a simple architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Feed Manager │  │ Article List│  │    Reader View      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        REST API                              │
│  /feeds  /articles  /tags  /reading-lists  /tts             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Services                               │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │FeedService │  │ArticleService│  │ ReadabilityService│   │
│  └────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
│  feeds │ articles │ tags │ reading_lists │ reading_progress │
└─────────────────────────────────────────────────────────────┘
```

No microservices. No message queues. No distributed caching. Just a monolithic application that does one thing well.

## Project Structure

```
reading-library/
├── src/
│   ├── api/
│   │   ├── index.ts              # Express app entry
│   │   ├── routes/
│   │   │   ├── feeds.ts          # Feed CRUD endpoints
│   │   │   ├── articles.ts       # Article endpoints
│   │   │   ├── tags.ts           # Tag management
│   │   │   ├── reading-lists.ts  # Reading list endpoints
│   │   │   └── tts.ts            # TTS generation
│   │   └── middleware/
│   │       ├── error.ts          # Error handling
│   │       └── validation.ts     # Request validation
│   ├── services/
│   │   ├── feed-service.ts       # RSS fetching and parsing
│   │   ├── article-service.ts    # Article CRUD
│   │   ├── readability-service.ts # Content extraction
│   │   ├── tts-service.ts        # Text-to-speech
│   │   └── scheduler-service.ts  # Background jobs
│   ├── db/
│   │   ├── client.ts             # Database connection
│   │   ├── migrations/           # Schema migrations
│   │   └── queries/              # SQL query functions
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── utils/
│       ├── html-cleaner.ts       # HTML sanitization
│       └── text-utils.ts         # Text processing
├── web/
│   ├── src/
│   │   ├── main.ts               # Vite entry
│   │   ├── components/           # UI components
│   │   ├── pages/                # Page components
│   │   ├── api/                  # API client
│   │   └── styles/               # CSS
│   ├── index.html
│   └── vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.api.json
├── docker-compose.yml
└── .env.example
```

## Database Schema

The database design prioritizes simplicity. Six tables cover everything:

```sql
-- Feeds you're subscribed to
CREATE TABLE feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    site_url TEXT,
    favicon_url TEXT,
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    fetch_error TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles from feeds (or manually added)
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID REFERENCES feeds(id) ON DELETE SET NULL,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    content TEXT NOT NULL,           -- Cleaned HTML content
    text_content TEXT NOT NULL,      -- Plain text for search/TTS
    excerpt TEXT,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    image_url TEXT,
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags for organization
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-many relationship between articles and tags
CREATE TABLE article_tags (
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Reading lists (collections of articles)
CREATE TABLE reading_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles in reading lists
CREATE TABLE reading_list_articles (
    reading_list_id UUID REFERENCES reading_lists(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (reading_list_id, article_id)
);

-- Reading progress (for both text and audio)
CREATE TABLE reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    scroll_position REAL DEFAULT 0,        -- 0-1 percentage
    audio_position REAL DEFAULT 0,         -- seconds
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (article_id)
);

-- Full-text search index
CREATE INDEX articles_search_idx ON articles
    USING GIN (to_tsvector('english', title || ' ' || text_content));

-- Performance indexes
CREATE INDEX articles_feed_id_idx ON articles(feed_id);
CREATE INDEX articles_published_at_idx ON articles(published_at DESC);
CREATE INDEX articles_is_read_idx ON articles(is_read);
CREATE INDEX articles_is_archived_idx ON articles(is_archived);
CREATE INDEX feeds_is_active_idx ON feeds(is_active);
```

### Design Decisions

**UUID primary keys**: Allows generating IDs client-side, which simplifies optimistic updates and offline support.

**Separate content and text_content**: We store both the cleaned HTML (for rendering) and plain text (for search and TTS). The duplication is worth it for query performance.

**Soft deletes via archiving**: Articles aren't deleted, just archived. This preserves reading history and allows recovery.

**Position fields for ordering**: Reading lists need user-defined ordering. Integer positions allow reordering without updating every row.

## TypeScript Configuration

Strict TypeScript catches bugs before they happen:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

```json
// tsconfig.api.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/api"
  },
  "include": ["src/api/**/*", "src/services/**/*", "src/db/**/*", "src/types/**/*", "src/utils/**/*"]
}
```

The key settings:

- **noUncheckedIndexedAccess**: Array access returns `T | undefined`, not `T`
- **exactOptionalPropertyTypes**: `{ a?: string }` means `a` can be `string` or missing, not `string | undefined`
- **noImplicitReturns**: Every code path must return explicitly

## Core Types

Define your domain types first:

```typescript
// src/types/index.ts

export interface Feed {
  id: string;
  url: string;
  title: string;
  description: string | null;
  siteUrl: string | null;
  faviconUrl: string | null;
  lastFetchedAt: Date | null;
  fetchError: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Article {
  id: string;
  feedId: string | null;
  url: string;
  title: string;
  author: string | null;
  publishedAt: Date | null;
  content: string;
  textContent: string;
  excerpt: string | null;
  wordCount: number;
  readingTimeMinutes: number;
  imageUrl: string | null;
  isRead: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface ReadingList {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingProgress {
  id: string;
  articleId: string;
  scrollPosition: number;
  audioPosition: number;
  lastReadAt: Date;
}

// API request/response types
export interface CreateFeedRequest {
  url: string;
}

export interface CreateArticleRequest {
  url: string;
  feedId?: string;
}

export interface UpdateArticleRequest {
  isRead?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
}

export interface UpdateReadingProgressRequest {
  scrollPosition?: number;
  audioPosition?: number;
}

export interface ArticleWithTags extends Article {
  tags: Tag[];
}

export interface FeedWithStats extends Feed {
  articleCount: number;
  unreadCount: number;
}
```

## Database Connection

A simple connection pool:

```typescript
// src/db/client.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export async function query<T>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function execute(
  text: string,
  params?: unknown[]
): Promise<number> {
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
}

export async function transaction<T>(
  callback: (client: Pool) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(pool);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
```

## Express API Setup

Minimal Express configuration:

```typescript
// src/api/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { feedsRouter } from './routes/feeds.js';
import { articlesRouter } from './routes/articles.js';
import { tagsRouter } from './routes/tags.js';
import { readingListsRouter } from './routes/reading-lists.js';
import { ttsRouter } from './routes/tts.js';
import { errorHandler } from './middleware/error.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));

// Parsing
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/feeds', feedsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/reading-lists', readingListsRouter);
app.use('/api/tts', ttsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

Error handling middleware:

```typescript
// src/api/middleware/error.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
```

## Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: library
      POSTGRES_PASSWORD: library
      POSTGRES_DB: reading_library
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U library"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Environment Configuration

```bash
# .env.example
DATABASE_URL=postgresql://library:library@localhost:5432/reading_library
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Optional: Premium TTS services
SPEECHIFY_API_KEY=
ELEVENLABS_API_KEY=
```

## Frontend Setup with Vite

Initialize the frontend:

```typescript
// web/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
  },
});
```

Basic HTML shell:

```html
<!-- web/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reading Library</title>
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

## Package Dependencies

```json
{
  "name": "reading-library",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "tsx watch src/api/index.ts",
    "dev:web": "vite",
    "build": "npm run build:api && npm run build:web",
    "build:api": "tsc -p tsconfig.api.json",
    "build:web": "vite build",
    "db:up": "docker-compose up -d db",
    "db:down": "docker-compose down",
    "lint": "eslint src web/src",
    "typecheck": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "helmet": "^8.0.0",
    "pg": "^8.13.0",
    "rss-parser": "^3.13.0",
    "@mozilla/readability": "^0.5.0",
    "jsdom": "^25.0.0",
    "sanitize-html": "^2.13.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsdom": "^21.1.7",
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "@types/sanitize-html": "^2.13.0",
    "concurrently": "^9.0.0",
    "eslint": "^9.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0"
  }
}
```

## Running the Application

```bash
# Start the database
npm run db:up

# Wait for database to be ready, then start development
npm run dev
```

The API runs on port 3000, the frontend on port 5173 with proxy to the API.

## Next Steps

With the foundation in place, we can start building features:

1. **Feed discovery** - Parse RSS feeds and store metadata
2. **Article ingestion** - Fetch full content and clean HTML
3. **Reader interface** - Display articles beautifully
4. **TTS integration** - Convert text to speech

The architecture supports all these features without modification. We just add routes, services, and components.
