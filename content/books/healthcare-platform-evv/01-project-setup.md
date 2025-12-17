# Project Setup and Architecture

Healthcare software demands rigor from the start. Decisions made in project setup echo through every feature—database design, API structure, security patterns. Getting the foundation right makes everything else easier.

This chapter covers setting up a healthcare platform the right way.

## Monorepo Structure

Healthcare platforms have multiple moving parts: API servers, web apps, mobile apps, shared libraries. A monorepo keeps them in sync:

```
folk-care/
├── packages/
│   ├── core/                 # Shared business logic
│   │   ├── src/
│   │   │   ├── db/          # Database utilities
│   │   │   ├── auth/        # Authentication
│   │   │   ├── ai/          # AI service abstractions
│   │   │   └── types/       # Shared TypeScript types
│   │   └── package.json
│   │
│   ├── app/                  # Main API server
│   │   ├── src/
│   │   │   ├── routes/      # Express routes
│   │   │   ├── middleware/  # Auth, validation, logging
│   │   │   └── services/    # Business logic
│   │   └── package.json
│   │
│   └── web/                  # Web frontend
│       ├── src/
│       └── package.json
│
├── verticals/               # Domain-specific packages
│   ├── care-plans-tasks/    # Care plan management
│   ├── scheduling-visits/   # Caregiver scheduling
│   ├── billing-invoicing/   # Financial features
│   └── compliance/          # Regulatory compliance
│
├── scripts/                 # Development utilities
├── docker-compose.yml       # Local development
├── turbo.json              # Turborepo configuration
└── package.json            # Root workspace
```

### Why This Structure?

**`packages/core`** - Shared code that every other package needs: database connections, authentication, types. Changes here affect everything, so it stays stable.

**`packages/app`** - The main API server. Routes, middleware, and orchestration. Thin—most business logic lives in verticals.

**`verticals/`** - Domain-specific features. Each vertical is relatively independent:
- `care-plans-tasks` - Creating and managing care plans
- `scheduling-visits` - Caregiver assignments and scheduling
- `billing-invoicing` - Invoices and payments
- `compliance` - Regulatory features

Verticals can depend on `core` but not on each other. This keeps coupling low.

## TypeScript Configuration

Healthcare software handles sensitive data. TypeScript's type system catches errors before they reach production:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,

    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Key settings for healthcare:

- **`strict: true`** - No implicit any, strict null checks. Every variable has a known type.
- **`noUncheckedIndexedAccess: true`** - Array access might return undefined. Forces you to handle missing data.
- **`exactOptionalPropertyTypes: true`** - Distinguishes between "property missing" and "property explicitly undefined."

These settings feel restrictive at first. They prevent the bugs that matter most in healthcare software.

## Database Design

Healthcare data has specific patterns. Here's a foundation schema:

```sql
-- packages/core/src/db/schema.sql

-- Core entities
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    medicaid_id VARCHAR(50),
    medicare_id VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    hire_date DATE,
    certifications JSONB DEFAULT '[]',
    hourly_rate DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care plans
CREATE TABLE care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    authorized_hours_per_week DECIMAL(5, 2),
    payer_id UUID REFERENCES payers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE care_plan_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID REFERENCES care_plans(id) NOT NULL,
    goal_text TEXT NOT NULL,
    target_date DATE,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduling
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) NOT NULL,
    caregiver_id UUID REFERENCES caregivers(id),
    care_plan_id UUID REFERENCES care_plans(id),
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'scheduled',
    clock_in_latitude DECIMAL(10, 8),
    clock_in_longitude DECIMAL(11, 8),
    clock_out_latitude DECIMAL(10, 8),
    clock_out_longitude DECIMAL(11, 8),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVV compliance
CREATE TABLE evv_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    client_verified BOOLEAN DEFAULT FALSE,
    caregiver_verified BOOLEAN DEFAULT FALSE,
    location_verified BOOLEAN DEFAULT FALSE,
    client_signature_url TEXT,
    caregiver_signature_url TEXT,
    verification_method VARCHAR(50),
    submitted_to_aggregator BOOLEAN DEFAULT FALSE,
    aggregator_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (HIPAA requirement)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_visits_client ON visits(client_id);
CREATE INDEX idx_visits_caregiver ON visits(caregiver_id);
CREATE INDEX idx_visits_scheduled ON visits(scheduled_start);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
```

### Design Decisions

**UUIDs over auto-increment** - Healthcare data gets shared across systems. UUIDs prevent ID collisions during integrations.

**Separate EVV records** - EVV has specific compliance requirements. A dedicated table makes auditing easier.

**Audit log table** - HIPAA requires tracking who accessed what. Log every significant action.

**Geographic coordinates** - EVV requires location verification. Store lat/long for distance calculations.

**JSONB for flexible data** - Certifications, aggregator responses, and other semi-structured data use JSONB. Avoids schema changes for every new certification type.

## Docker Development Environment

Local development should mirror production:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: folkcare
      POSTGRES_PASSWORD: development
      POSTGRES_DB: folkcare
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/core/src/db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U folkcare"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://folkcare:development@postgres:5432/folkcare
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

## Security from Day One

Healthcare software handles PHI (Protected Health Information). Build security in:

```typescript
// packages/core/src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Express } from 'express';

export function configureSecurityMiddleware(app: Express) {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please try again later' },
  });

  app.use('/api/', apiLimiter);

  // Disable fingerprinting
  app.disable('x-powered-by');
}
```

### Audit Logging

```typescript
// packages/core/src/audit/logger.ts
import { db } from '../db';

interface AuditEntry {
  userId?: string;
  action: 'create' | 'read' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  await db.query(
    `INSERT INTO audit_log
     (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.userId,
      entry.action,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.oldValues),
      JSON.stringify(entry.newValues),
      entry.ipAddress,
      entry.userAgent,
    ]
  );
}

// Middleware to track reads
export function auditReadMiddleware(entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const entityId = req.params.id;

    // Log after successful response
    res.on('finish', () => {
      if (res.statusCode === 200) {
        logAuditEntry({
          userId: req.user?.id,
          action: 'read',
          entityType,
          entityId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
    });

    next();
  };
}
```

## Environment Configuration

Never hardcode secrets:

```typescript
// packages/core/src/config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),

  // EVV Aggregator
  EVV_AGGREGATOR_URL: z.string().url().optional(),
  EVV_AGGREGATOR_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
```

## Vibe Coding the Setup

When setting up a healthcare project with AI:

> "Create a TypeScript monorepo structure for a healthcare platform with care plans, scheduling, billing, and compliance verticals"

> "Design a PostgreSQL schema for tracking patient visits with EVV compliance fields including GPS coordinates and signatures"

> "Add HIPAA-appropriate audit logging middleware that tracks all PHI access"

> "Configure security headers and rate limiting for a healthcare API"

AI handles the boilerplate beautifully. You focus on healthcare-specific requirements.

## Testing the Foundation

Before building features, verify the foundation works:

```bash
# Start services
docker-compose up -d

# Run migrations
npm run db:migrate

# Verify database
npm run db:status

# Run health check
curl http://localhost:3000/health
```

## Next Steps

With the project structure in place, we can build the core healthcare feature: care plans. In the next chapter, we'll create the data models and APIs that power everything else in a home healthcare platform.
