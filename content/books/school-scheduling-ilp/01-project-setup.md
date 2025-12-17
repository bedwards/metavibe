# Project Setup

## Architecture Overview

A school scheduling system has three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Data Entry  │  │  Schedule   │  │    Export/Import    │  │
│  │   Forms     │  │    Grid     │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        REST API                              │
│  /teachers  /classes  /rooms  /timeslots  /constraints      │
│                              │                               │
│                     /schedules/generate                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Services                               │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Data Service  │  │  ILP Builder   │  │    Solver    │  │
│  │                │  │                │  │   (HiGHS)    │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
│  teachers │ classes │ rooms │ timeslots │ constraints       │
│                      schedules │ assignments                 │
└─────────────────────────────────────────────────────────────┘
```

The key insight: the ILP solver is a black box. You feed it a model, it returns a solution. The complexity is in building the model correctly.

## Project Structure

```
school-scheduler/
├── src/
│   ├── api/
│   │   ├── index.ts              # Express app
│   │   ├── routes/
│   │   │   ├── teachers.ts
│   │   │   ├── classes.ts
│   │   │   ├── rooms.ts
│   │   │   ├── timeslots.ts
│   │   │   ├── constraints.ts
│   │   │   └── schedules.ts
│   │   └── middleware/
│   │       └── error.ts
│   ├── services/
│   │   ├── data-service.ts       # CRUD operations
│   │   ├── ilp-builder.ts        # Builds ILP model
│   │   ├── solver-service.ts     # Runs HiGHS
│   │   └── schedule-service.ts   # Extracts/validates solutions
│   ├── db/
│   │   ├── client.ts             # Database connection
│   │   ├── migrations/           # Schema migrations
│   │   └── seed.ts               # Sample data
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── utils/
│       └── ilp-utils.ts          # Helper functions
├── web/
│   ├── src/
│   │   ├── main.ts
│   │   ├── components/
│   │   │   ├── TeacherForm.ts
│   │   │   ├── ScheduleGrid.ts
│   │   │   └── ...
│   │   └── api/
│   │       └── client.ts
│   ├── index.html
│   └── vite.config.ts
├── package.json
├── tsconfig.json
└── docker-compose.yml
```

## Core Types

Define the domain model first:

```typescript
// src/types/index.ts

// === Entities ===

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherAvailability {
  id: string;
  teacherId: string;
  dayOfWeek: number;  // 0-6, Sunday-Saturday
  periodId: string;
  isAvailable: boolean;
  preference: number; // -2 to 2, negative=avoid, positive=prefer
}

export interface Class {
  id: string;
  name: string;         // "Algebra I"
  code: string;         // "MATH101"
  department: string;
  periodsPerWeek: number;
  requiresLab: boolean;
  maxStudents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  name: string;         // "Room 101"
  building: string;
  capacity: number;
  isLab: boolean;
  equipment: string[];  // ["projector", "whiteboard", "computers"]
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;    // "08:00"
  endTime: string;      // "08:50"
  isBreak: boolean;
}

export interface Section {
  id: string;
  classId: string;
  teacherId: string;
  sectionNumber: number; // For multiple sections of same class
  maxStudents: number;
}

// === Constraints ===

export type ConstraintType =
  | 'teacher_unavailable'      // Teacher can't teach at this time
  | 'room_unavailable'         // Room can't be used at this time
  | 'teacher_max_consecutive'  // Max consecutive periods for teacher
  | 'section_same_time'        // Two sections must be at same time
  | 'section_different_time'   // Two sections can't be at same time
  | 'room_required'            // Section must be in specific room
  | 'period_preference';       // Prefer/avoid certain periods

export interface Constraint {
  id: string;
  type: ConstraintType;
  priority: 'hard' | 'soft';   // Hard = must satisfy, Soft = try to satisfy
  weight: number;              // For soft constraints, higher = more important
  parameters: Record<string, unknown>;
  createdAt: Date;
}

// === Schedule ===

export interface Schedule {
  id: string;
  name: string;
  semester: string;
  status: 'draft' | 'published';
  generatedAt: Date | null;
  solverTime: number | null;   // milliseconds
  objectiveValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  scheduleId: string;
  sectionId: string;
  roomId: string;
  timeSlotId: string;
  isManualOverride: boolean;
  createdAt: Date;
}

// === ILP Model Types ===

export interface ILPVariable {
  name: string;
  type: 'binary' | 'integer' | 'continuous';
  lowerBound: number;
  upperBound: number;
  objectiveCoefficient: number;
}

export interface ILPConstraint {
  name: string;
  coefficients: Map<string, number>;  // variable name -> coefficient
  sense: '<=' | '=' | '>=';
  rhs: number;  // right-hand side value
}

export interface ILPModel {
  variables: ILPVariable[];
  constraints: ILPConstraint[];
  objective: 'minimize' | 'maximize';
}

export interface ILPSolution {
  status: 'optimal' | 'feasible' | 'infeasible' | 'unbounded' | 'timeout';
  objectiveValue: number | null;
  variables: Map<string, number>;
  solveTime: number;
}
```

## Database Schema

```sql
-- src/db/migrations/001_initial.sql

-- Teachers
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department TEXT NOT NULL,
    max_periods_per_day INTEGER DEFAULT 6,
    max_periods_per_week INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher availability
CREATE TABLE teacher_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    period_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    preference INTEGER DEFAULT 0 CHECK (preference BETWEEN -2 AND 2),
    UNIQUE (teacher_id, day_of_week, period_id)
);

-- Classes (course definitions)
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    periods_per_week INTEGER NOT NULL DEFAULT 5,
    requires_lab BOOLEAN DEFAULT false,
    max_students INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    building TEXT,
    capacity INTEGER NOT NULL,
    is_lab BOOLEAN DEFAULT false,
    equipment TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time slots (periods)
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT false,
    UNIQUE (day_of_week, period_number)
);

-- Sections (instances of classes with assigned teacher)
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    section_number INTEGER NOT NULL DEFAULT 1,
    max_students INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (class_id, section_number)
);

-- Constraints
CREATE TABLE constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'soft' CHECK (priority IN ('hard', 'soft')),
    weight INTEGER DEFAULT 1,
    parameters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    semester TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    generated_at TIMESTAMP WITH TIME ZONE,
    solver_time INTEGER,
    objective_value REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments (the actual schedule)
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    is_manual_override BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (schedule_id, section_id, time_slot_id),
    UNIQUE (schedule_id, room_id, time_slot_id)
);

-- Indexes for common queries
CREATE INDEX idx_sections_teacher ON sections(teacher_id);
CREATE INDEX idx_sections_class ON sections(class_id);
CREATE INDEX idx_assignments_schedule ON assignments(schedule_id);
CREATE INDEX idx_assignments_section ON assignments(section_id);
CREATE INDEX idx_teacher_availability_teacher ON teacher_availability(teacher_id);
```

## Database Client

```typescript
// src/db/client.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
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

export { pool };
```

## HiGHS Solver Setup

Install HiGHS for Node.js:

```bash
npm install highs
```

The `highs` package provides WebAssembly bindings to the HiGHS solver. It works in both Node.js and browsers.

Basic solver wrapper:

```typescript
// src/services/solver-service.ts
import highs from 'highs';

export interface SolverOptions {
  timeLimit?: number;      // seconds
  mipGap?: number;         // relative gap for stopping (0.01 = 1%)
  threads?: number;        // parallel threads
  presolve?: boolean;      // preprocessing
}

export class SolverService {
  private solver: Awaited<ReturnType<typeof highs>> | null = null;

  async initialize(): Promise<void> {
    if (!this.solver) {
      this.solver = await highs();
    }
  }

  async solve(
    model: string,  // LP/MPS format string
    options: SolverOptions = {}
  ): Promise<{
    status: string;
    objectiveValue: number | null;
    solution: Record<string, number>;
    solveTime: number;
  }> {
    await this.initialize();

    const startTime = Date.now();

    // Set options
    if (options.timeLimit) {
      this.solver!.setOption('time_limit', options.timeLimit);
    }
    if (options.mipGap) {
      this.solver!.setOption('mip_rel_gap', options.mipGap);
    }
    if (options.threads) {
      this.solver!.setOption('threads', options.threads);
    }
    if (options.presolve !== undefined) {
      this.solver!.setOption('presolve', options.presolve ? 'on' : 'off');
    }

    // Solve
    const result = this.solver!.solve(model);

    const solveTime = Date.now() - startTime;

    // Extract solution
    const solution: Record<string, number> = {};

    if (result.Status === 'Optimal' || result.Status === 'Feasible') {
      for (const col of result.Columns) {
        solution[col.Name] = col.Primal;
      }
    }

    return {
      status: result.Status,
      objectiveValue:
        result.Status === 'Optimal' || result.Status === 'Feasible'
          ? result.ObjectiveValue
          : null,
      solution,
      solveTime,
    };
  }
}

export const solverService = new SolverService();
```

## Express API Setup

```typescript
// src/api/index.ts
import express from 'express';
import cors from 'cors';
import { teachersRouter } from './routes/teachers.js';
import { classesRouter } from './routes/classes.js';
import { roomsRouter } from './routes/rooms.js';
import { timeslotsRouter } from './routes/timeslots.js';
import { sectionsRouter } from './routes/sections.js';
import { constraintsRouter } from './routes/constraints.js';
import { schedulesRouter } from './routes/schedules.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/teachers', teachersRouter);
app.use('/api/classes', classesRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/timeslots', timeslotsRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/constraints', constraintsRouter);
app.use('/api/schedules', schedulesRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: scheduler
      POSTGRES_PASSWORD: scheduler
      POSTGRES_DB: school_scheduler
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/migrations:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
```

## Package Configuration

```json
{
  "name": "school-scheduler",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/api/index.ts",
    "build": "tsc",
    "start": "node dist/api/index.js",
    "db:up": "docker-compose up -d db",
    "db:down": "docker-compose down",
    "db:seed": "tsx src/db/seed.ts",
    "test": "vitest"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "highs": "^1.0.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

## Running the Application

```bash
# Start the database
npm run db:up

# Seed with sample data
npm run db:seed

# Start the development server
npm run dev
```

## Next Steps

With the foundation in place, the next chapter dives into the data model—how to represent teachers, classes, rooms, and the constraints that govern scheduling.
