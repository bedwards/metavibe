# Care Plans and Tasks

Care plans are the heart of home healthcare. They define what care a patient needs, what goals they're working toward, and what tasks caregivers should perform during visits. Everything else—scheduling, billing, compliance—flows from the care plan.

This chapter covers building a comprehensive care plan management system.

## Understanding Care Plans

A care plan typically includes:

- **Patient information** - Who receives care
- **Authorized services** - What care is approved (and paid for)
- **Goals** - What outcomes we're working toward
- **Interventions** - Specific actions to achieve goals
- **Tasks** - Concrete activities for each visit
- **Frequency** - How often services occur

```typescript
// verticals/care-plans-tasks/src/types.ts
export interface CarePlan {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  authorizedHoursPerWeek?: number;
  payerId?: string;
  goals: CarePlanGoal[];
  interventions: Intervention[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CarePlanGoal {
  id: string;
  carePlanId: string;
  goalText: string;
  targetDate?: Date;
  status: 'not_started' | 'in_progress' | 'achieved' | 'discontinued';
  progressNotes: GoalProgressNote[];
}

export interface Intervention {
  id: string;
  carePlanId: string;
  goalId: string;
  description: string;
  frequency: string; // "Daily", "3x per week", etc.
  taskTemplates: TaskTemplate[];
}

export interface TaskTemplate {
  id: string;
  interventionId: string;
  name: string;
  description?: string;
  estimatedMinutes: number;
  category: TaskCategory;
  requiredCertifications: string[];
}

export type TaskCategory =
  | 'personal_care'
  | 'medication'
  | 'mobility'
  | 'nutrition'
  | 'companionship'
  | 'housekeeping'
  | 'transportation';
```

## Care Plan Service

The service layer handles business logic:

```typescript
// verticals/care-plans-tasks/src/services/care-plan-service.ts
import { db } from '@folkcare/core';
import { logAuditEntry } from '@folkcare/core/audit';
import { CarePlan, CarePlanGoal, CreateCarePlanInput } from '../types';

export class CarePlanService {
  async createCarePlan(
    input: CreateCarePlanInput,
    userId: string
  ): Promise<CarePlan> {
    const result = await db.query(
      `INSERT INTO care_plans
       (client_id, name, description, start_date, end_date,
        authorized_hours_per_week, payer_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
       RETURNING *`,
      [
        input.clientId,
        input.name,
        input.description,
        input.startDate,
        input.endDate,
        input.authorizedHoursPerWeek,
        input.payerId,
      ]
    );

    const carePlan = this.mapRow(result.rows[0]);

    await logAuditEntry({
      userId,
      action: 'create',
      entityType: 'care_plan',
      entityId: carePlan.id,
      newValues: input,
    });

    return carePlan;
  }

  async getCarePlan(id: string): Promise<CarePlan | null> {
    const result = await db.query(
      `SELECT cp.*,
              json_agg(DISTINCT cpg.*) as goals
       FROM care_plans cp
       LEFT JOIN care_plan_goals cpg ON cpg.care_plan_id = cp.id
       WHERE cp.id = $1
       GROUP BY cp.id`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowWithRelations(result.rows[0]);
  }

  async getCarePlansForClient(clientId: string): Promise<CarePlan[]> {
    const result = await db.query(
      `SELECT * FROM care_plans
       WHERE client_id = $1
       ORDER BY start_date DESC`,
      [clientId]
    );

    return result.rows.map(this.mapRow);
  }

  async activateCarePlan(id: string, userId: string): Promise<CarePlan> {
    // Validate plan has required elements
    const plan = await this.getCarePlan(id);
    if (!plan) throw new Error('Care plan not found');

    if (plan.goals.length === 0) {
      throw new Error('Cannot activate care plan without goals');
    }

    const result = await db.query(
      `UPDATE care_plans
       SET status = 'active', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await logAuditEntry({
      userId,
      action: 'update',
      entityType: 'care_plan',
      entityId: id,
      oldValues: { status: plan.status },
      newValues: { status: 'active' },
    });

    return this.mapRow(result.rows[0]);
  }

  async addGoal(
    carePlanId: string,
    goalText: string,
    targetDate: Date | null,
    userId: string
  ): Promise<CarePlanGoal> {
    const result = await db.query(
      `INSERT INTO care_plan_goals
       (care_plan_id, goal_text, target_date, status)
       VALUES ($1, $2, $3, 'not_started')
       RETURNING *`,
      [carePlanId, goalText, targetDate]
    );

    const goal = result.rows[0];

    await logAuditEntry({
      userId,
      action: 'create',
      entityType: 'care_plan_goal',
      entityId: goal.id,
      newValues: { carePlanId, goalText, targetDate },
    });

    return goal;
  }

  async updateGoalProgress(
    goalId: string,
    status: CarePlanGoal['status'],
    note: string,
    userId: string
  ): Promise<void> {
    await db.query('BEGIN');

    try {
      // Update goal status
      await db.query(
        `UPDATE care_plan_goals
         SET status = $1
         WHERE id = $2`,
        [status, goalId]
      );

      // Add progress note
      await db.query(
        `INSERT INTO goal_progress_notes
         (goal_id, note, recorded_by, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [goalId, note, userId]
      );

      await db.query('COMMIT');

      await logAuditEntry({
        userId,
        action: 'update',
        entityType: 'care_plan_goal',
        entityId: goalId,
        newValues: { status, note },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  private mapRow(row: Record<string, unknown>): CarePlan {
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      startDate: new Date(row.start_date as string),
      endDate: row.end_date ? new Date(row.end_date as string) : undefined,
      status: row.status as CarePlan['status'],
      authorizedHoursPerWeek: row.authorized_hours_per_week as number | undefined,
      payerId: row.payer_id as string | undefined,
      goals: [],
      interventions: [],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowWithRelations(row: Record<string, unknown>): CarePlan {
    const plan = this.mapRow(row);
    plan.goals = (row.goals as CarePlanGoal[]) || [];
    return plan;
  }
}

export const carePlanService = new CarePlanService();
```

## API Routes

RESTful endpoints for care plan management:

```typescript
// verticals/care-plans-tasks/src/routes/care-plan-routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { carePlanService } from '../services/care-plan-service';
import { validateBody, requireAuth } from '@folkcare/core/middleware';

const router = Router();

const createCarePlanSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  authorizedHoursPerWeek: z.number().positive().optional(),
  payerId: z.string().uuid().optional(),
});

router.post(
  '/care-plans',
  requireAuth,
  validateBody(createCarePlanSchema),
  async (req, res, next) => {
    try {
      const carePlan = await carePlanService.createCarePlan(
        req.body,
        req.user.id
      );
      res.status(201).json(carePlan);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/care-plans/:id', requireAuth, async (req, res, next) => {
  try {
    const carePlan = await carePlanService.getCarePlan(req.params.id);
    if (!carePlan) {
      return res.status(404).json({ error: 'Care plan not found' });
    }
    res.json(carePlan);
  } catch (error) {
    next(error);
  }
});

router.get(
  '/clients/:clientId/care-plans',
  requireAuth,
  async (req, res, next) => {
    try {
      const carePlans = await carePlanService.getCarePlansForClient(
        req.params.clientId
      );
      res.json(carePlans);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/care-plans/:id/activate',
  requireAuth,
  async (req, res, next) => {
    try {
      const carePlan = await carePlanService.activateCarePlan(
        req.params.id,
        req.user.id
      );
      res.json(carePlan);
    } catch (error) {
      next(error);
    }
  }
);

const addGoalSchema = z.object({
  goalText: z.string().min(1),
  targetDate: z.string().datetime().optional(),
});

router.post(
  '/care-plans/:id/goals',
  requireAuth,
  validateBody(addGoalSchema),
  async (req, res, next) => {
    try {
      const goal = await carePlanService.addGoal(
        req.params.id,
        req.body.goalText,
        req.body.targetDate ? new Date(req.body.targetDate) : null,
        req.user.id
      );
      res.status(201).json(goal);
    } catch (error) {
      next(error);
    }
  }
);

export { router as carePlanRoutes };
```

## Task Management

Tasks are generated from care plans and assigned to visits:

```typescript
// verticals/care-plans-tasks/src/services/task-service.ts
import { db } from '@folkcare/core';

export interface Task {
  id: string;
  visitId: string;
  templateId: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export class TaskService {
  async generateTasksForVisit(visitId: string): Promise<Task[]> {
    // Get the visit with its care plan
    const visitResult = await db.query(
      `SELECT v.*, cp.id as care_plan_id
       FROM visits v
       JOIN care_plans cp ON cp.id = v.care_plan_id
       WHERE v.id = $1`,
      [visitId]
    );

    if (visitResult.rows.length === 0) {
      throw new Error('Visit not found');
    }

    const visit = visitResult.rows[0];

    // Get task templates for this care plan
    const templatesResult = await db.query(
      `SELECT tt.*
       FROM task_templates tt
       JOIN interventions i ON i.id = tt.intervention_id
       WHERE i.care_plan_id = $1`,
      [visit.care_plan_id]
    );

    // Create tasks from templates
    const tasks: Task[] = [];

    for (const template of templatesResult.rows) {
      const taskResult = await db.query(
        `INSERT INTO tasks
         (visit_id, template_id, name, description, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [visitId, template.id, template.name, template.description]
      );

      tasks.push(this.mapRow(taskResult.rows[0]));
    }

    return tasks;
  }

  async completeTask(
    taskId: string,
    userId: string,
    notes?: string
  ): Promise<Task> {
    const result = await db.query(
      `UPDATE tasks
       SET status = 'completed',
           completed_at = NOW(),
           completed_by = $2,
           notes = $3
       WHERE id = $1
       RETURNING *`,
      [taskId, userId, notes]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    return this.mapRow(result.rows[0]);
  }

  async skipTask(
    taskId: string,
    userId: string,
    reason: string
  ): Promise<Task> {
    const result = await db.query(
      `UPDATE tasks
       SET status = 'skipped',
           completed_by = $2,
           notes = $3
       WHERE id = $1
       RETURNING *`,
      [taskId, userId, reason]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    return this.mapRow(result.rows[0]);
  }

  async getTasksForVisit(visitId: string): Promise<Task[]> {
    const result = await db.query(
      `SELECT * FROM tasks
       WHERE visit_id = $1
       ORDER BY created_at`,
      [visitId]
    );

    return result.rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      visitId: row.visit_id as string,
      templateId: row.template_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as Task['status'],
      completedAt: row.completed_at
        ? new Date(row.completed_at as string)
        : undefined,
      completedBy: row.completed_by as string | undefined,
      notes: row.notes as string | undefined,
    };
  }
}

export const taskService = new TaskService();
```

## Task Prioritization

Not all tasks are equally urgent:

```typescript
// verticals/care-plans-tasks/src/services/task-prioritization-service.ts

export interface PrioritizedTask {
  task: Task;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  priorityScore: number;
  reasons: string[];
}

export class TaskPrioritizationService {
  prioritizeTasks(tasks: Task[], context: TaskContext): PrioritizedTask[] {
    return tasks
      .map((task) => this.calculatePriority(task, context))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  private calculatePriority(
    task: Task,
    context: TaskContext
  ): PrioritizedTask {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Category-based priority
    if (task.category === 'medication') {
      score += 30;
      reasons.push('Medication tasks are time-sensitive');
    } else if (task.category === 'personal_care') {
      score += 20;
      reasons.push('Personal care is essential');
    }

    // Deadline proximity
    if (task.dueTime) {
      const hoursUntilDue =
        (task.dueTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDue < 1) {
        score += 40;
        reasons.push('Due within 1 hour');
      } else if (hoursUntilDue < 4) {
        score += 20;
        reasons.push('Due within 4 hours');
      }
    }

    // Client condition
    if (context.clientCondition === 'declining') {
      score += 15;
      reasons.push('Client condition requires attention');
    }

    // Previous missed tasks
    if (context.previousMissedTasks > 0) {
      score += 10 * context.previousMissedTasks;
      reasons.push(`${context.previousMissedTasks} similar tasks missed recently`);
    }

    // Determine priority level
    let priority: PrioritizedTask['priority'];
    if (score >= 90) priority = 'urgent';
    else if (score >= 70) priority = 'high';
    else if (score >= 50) priority = 'medium';
    else priority = 'low';

    return {
      task,
      priority,
      priorityScore: score,
      reasons,
    };
  }
}

interface TaskContext {
  clientCondition: 'stable' | 'improving' | 'declining';
  previousMissedTasks: number;
}
```

## Vibe Coding Care Plans

When building care plan features with AI:

> "Create a TypeScript service for managing care plans with goals, interventions, and task templates"

> "Build an API endpoint that generates tasks from care plan templates when a visit is created"

> "Implement task prioritization that considers medication timing, client condition, and missed tasks"

> "Add goal progress tracking with notes and status updates"

AI understands healthcare workflows. Describe what you need in clinical terms, and it translates to code.

## Testing Care Plan Logic

Care plans have complex business rules. Test them:

```typescript
// verticals/care-plans-tasks/src/services/__tests__/care-plan-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { carePlanService } from '../care-plan-service';

describe('CarePlanService', () => {
  describe('activateCarePlan', () => {
    it('should not activate a plan without goals', async () => {
      const plan = await carePlanService.createCarePlan({
        clientId: 'test-client',
        name: 'Test Plan',
        startDate: new Date(),
      }, 'test-user');

      await expect(
        carePlanService.activateCarePlan(plan.id, 'test-user')
      ).rejects.toThrow('Cannot activate care plan without goals');
    });

    it('should activate a plan with goals', async () => {
      const plan = await carePlanService.createCarePlan({
        clientId: 'test-client',
        name: 'Test Plan',
        startDate: new Date(),
      }, 'test-user');

      await carePlanService.addGoal(
        plan.id,
        'Improve mobility',
        null,
        'test-user'
      );

      const activated = await carePlanService.activateCarePlan(
        plan.id,
        'test-user'
      );

      expect(activated.status).toBe('active');
    });
  });
});
```

## Next Steps

With care plans in place, we need caregivers to execute them. In the next chapter, we'll build the caregiver management system—profiles, credentials, availability, and AI-powered matching that pairs the right caregiver with each patient.
