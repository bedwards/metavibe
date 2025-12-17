# Integrating the ILP Solver

## HiGHS Overview

HiGHS (High-performance Solver) is an open-source optimization solver. It handles:
- Linear Programming (LP)
- Mixed Integer Programming (MIP)
- Quadratic Programming (QP)

For scheduling, we use MIP (Mixed Integer Programming) with binary variables.

HiGHS is competitive with commercial solvers like Gurobi and CPLEX for many problem types, but it's free and MIT-licensed.

## Installing HiGHS

```bash
npm install highs
```

The `highs` package provides WebAssembly bindings that work in both Node.js and browsers.

## Basic Solver Wrapper

```typescript
// src/services/highs-solver.ts
import highsLoader from 'highs';

export type SolverStatus =
  | 'Optimal'
  | 'Infeasible'
  | 'Unbounded'
  | 'TimeLimit'
  | 'Error';

export interface SolverResult {
  status: SolverStatus;
  objectiveValue: number | null;
  solution: Map<string, number>;
  solveTimeMs: number;
  iterations: number;
  nodes: number;
}

export interface SolverOptions {
  timeLimit?: number;       // seconds
  mipGap?: number;          // relative gap (0.01 = 1%)
  threads?: number;         // parallel threads
  presolve?: 'on' | 'off';
  verbose?: boolean;
}

export class HighsSolver {
  private highs: Awaited<ReturnType<typeof highsLoader>> | null = null;

  async initialize(): Promise<void> {
    if (!this.highs) {
      this.highs = await highsLoader();
    }
  }

  async solve(
    lpFormat: string,
    options: SolverOptions = {}
  ): Promise<SolverResult> {
    await this.initialize();

    const startTime = Date.now();

    // Configure options
    if (options.timeLimit) {
      this.highs!.setOptionValue('time_limit', options.timeLimit);
    }
    if (options.mipGap) {
      this.highs!.setOptionValue('mip_rel_gap', options.mipGap);
    }
    if (options.threads) {
      this.highs!.setOptionValue('threads', options.threads);
    }
    if (options.presolve) {
      this.highs!.setOptionValue('presolve', options.presolve);
    }
    if (!options.verbose) {
      this.highs!.setOptionValue('output_flag', false);
    }

    // Solve
    const result = this.highs!.solve(lpFormat);

    const solveTimeMs = Date.now() - startTime;

    // Extract solution
    const solution = new Map<string, number>();

    if (result.Status === 'Optimal' || result.Status === 'Feasible') {
      for (const col of result.Columns) {
        // Only include non-zero values for binary variables
        if (col.Primal > 0.5) {
          solution.set(col.Name, Math.round(col.Primal));
        }
      }
    }

    // Map status
    let status: SolverStatus;
    switch (result.Status) {
      case 'Optimal':
        status = 'Optimal';
        break;
      case 'Infeasible':
        status = 'Infeasible';
        break;
      case 'Unbounded':
        status = 'Unbounded';
        break;
      case 'Time limit reached':
        status = 'TimeLimit';
        break;
      default:
        status = 'Error';
    }

    return {
      status,
      objectiveValue:
        status === 'Optimal' || status === 'TimeLimit'
          ? result.ObjectiveValue
          : null,
      solution,
      solveTimeMs,
      iterations: result.Info?.ipm_iteration_count ?? 0,
      nodes: result.Info?.mip_node_count ?? 0,
    };
  }

  /**
   * Solve with callback for progress updates
   */
  async solveWithProgress(
    lpFormat: string,
    options: SolverOptions = {},
    onProgress?: (info: {
      elapsedMs: number;
      gap: number | null;
      bestBound: number | null;
      bestSolution: number | null;
    }) => void
  ): Promise<SolverResult> {
    // For progress tracking, we use a polling approach
    // since HiGHS WASM doesn't support callbacks directly

    const startTime = Date.now();
    let lastUpdate = 0;

    // Start solving (non-blocking isn't directly supported, so this is simplified)
    const result = await this.solve(lpFormat, options);

    // Report final progress
    if (onProgress) {
      onProgress({
        elapsedMs: Date.now() - startTime,
        gap: 0,
        bestBound: result.objectiveValue,
        bestSolution: result.objectiveValue,
      });
    }

    return result;
  }
}

export const highsSolver = new HighsSolver();
```

## Solution Extraction

Convert solver output to schedule assignments:

```typescript
// src/services/solution-extractor.ts

import type { SolverResult } from './highs-solver.js';
import type { Assignment } from '../types/index.js';

export interface ExtractedSchedule {
  assignments: Array<{
    sectionId: string;
    roomId: string;
    timeSlotId: string;
  }>;
  objectiveValue: number;
  stats: {
    totalAssignments: number;
    periodsUsed: Map<string, number>;  // section -> periods
    roomUtilization: Map<string, number>;  // room -> periods used
    teacherLoad: Map<string, number>;  // teacher -> periods
  };
}

export function extractSchedule(
  result: SolverResult,
  sectionTeacher: Map<string, string>
): ExtractedSchedule {
  const assignments: ExtractedSchedule['assignments'] = [];
  const periodsUsed = new Map<string, number>();
  const roomUtilization = new Map<string, number>();
  const teacherLoad = new Map<string, number>();

  for (const [varName, value] of result.solution) {
    // Parse variable name: x_sectionId_roomId_slotId
    if (!varName.startsWith('x_')) continue;
    if (value < 0.5) continue; // Not selected

    const parts = varName.substring(2).split('_');
    if (parts.length !== 3) continue;

    const [sectionId, roomId, timeSlotId] = parts as [string, string, string];

    assignments.push({ sectionId, roomId, timeSlotId });

    // Update stats
    periodsUsed.set(sectionId, (periodsUsed.get(sectionId) ?? 0) + 1);
    roomUtilization.set(roomId, (roomUtilization.get(roomId) ?? 0) + 1);

    const teacher = sectionTeacher.get(sectionId);
    if (teacher) {
      teacherLoad.set(teacher, (teacherLoad.get(teacher) ?? 0) + 1);
    }
  }

  return {
    assignments,
    objectiveValue: result.objectiveValue ?? 0,
    stats: {
      totalAssignments: assignments.length,
      periodsUsed,
      roomUtilization,
      teacherLoad,
    },
  };
}

/**
 * Validate extracted schedule
 */
export function validateSchedule(
  schedule: ExtractedSchedule,
  expected: {
    sectionPeriods: Map<string, number>;
    sectionTeacher: Map<string, string>;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check: Each section has correct number of periods
  for (const [sectionId, required] of expected.sectionPeriods) {
    const assigned = schedule.stats.periodsUsed.get(sectionId) ?? 0;
    if (assigned !== required) {
      errors.push(
        `Section ${sectionId}: expected ${required} periods, got ${assigned}`
      );
    }
  }

  // Check: No teacher conflicts
  const teacherSlots = new Map<string, Set<string>>();
  for (const assignment of schedule.assignments) {
    const teacher = expected.sectionTeacher.get(assignment.sectionId);
    if (!teacher) continue;

    const slots = teacherSlots.get(teacher) ?? new Set();
    if (slots.has(assignment.timeSlotId)) {
      errors.push(
        `Teacher ${teacher} has conflict at slot ${assignment.timeSlotId}`
      );
    }
    slots.add(assignment.timeSlotId);
    teacherSlots.set(teacher, slots);
  }

  // Check: No room conflicts
  const roomSlots = new Map<string, Set<string>>();
  for (const assignment of schedule.assignments) {
    const slots = roomSlots.get(assignment.roomId) ?? new Set();
    if (slots.has(assignment.timeSlotId)) {
      errors.push(
        `Room ${assignment.roomId} has conflict at slot ${assignment.timeSlotId}`
      );
    }
    slots.add(assignment.timeSlotId);
    roomSlots.set(assignment.roomId, slots);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Handling Infeasibility

When the solver returns "Infeasible", the model has contradictory constraints. Diagnosing this is crucial:

```typescript
// src/services/infeasibility-analyzer.ts

export interface InfeasibilityDiagnosis {
  likely_causes: string[];
  suggestions: string[];
  constraint_analysis: Array<{
    constraint: string;
    type: string;
    tension: 'high' | 'medium' | 'low';
  }>;
}

export async function diagnoseInfeasibility(
  indices: ModelIndices
): Promise<InfeasibilityDiagnosis> {
  const causes: string[] = [];
  const suggestions: string[] = [];
  const analysis: InfeasibilityDiagnosis['constraint_analysis'] = [];

  // Check: Total periods vs available slots
  let totalPeriodsNeeded = 0;
  for (const periods of indices.sectionPeriods.values()) {
    totalPeriodsNeeded += periods;
  }

  const totalRoomSlots = indices.rooms.length * indices.timeSlots.length;

  if (totalPeriodsNeeded > totalRoomSlots) {
    causes.push(
      `Need ${totalPeriodsNeeded} period-assignments but only ` +
      `${totalRoomSlots} room-slots available`
    );
    suggestions.push('Add more rooms or time slots');
    suggestions.push('Reduce number of sections or periods per section');
    analysis.push({
      constraint: 'capacity',
      type: 'total_capacity',
      tension: 'high',
    });
  }

  // Check: Lab capacity
  let labPeriodsNeeded = 0;
  for (const section of indices.sections) {
    if (indices.sectionNeedsLab.has(section)) {
      labPeriodsNeeded += indices.sectionPeriods.get(section) ?? 0;
    }
  }

  const labRooms = Array.from(indices.roomIsLab).length;
  const labSlots = labRooms * indices.timeSlots.length;

  if (labPeriodsNeeded > labSlots) {
    causes.push(
      `Need ${labPeriodsNeeded} lab periods but only ` +
      `${labSlots} lab-slots available`
    );
    suggestions.push('Add more lab rooms');
    suggestions.push('Reduce lab sections or lab periods');
    analysis.push({
      constraint: 'lab_capacity',
      type: 'resource_constraint',
      tension: 'high',
    });
  }

  // Check: Teacher availability
  for (const [teacher, sections] of indices.teacherSections) {
    let periodsNeeded = 0;
    for (const section of sections) {
      periodsNeeded += indices.sectionPeriods.get(section) ?? 0;
    }

    const unavailable = indices.teacherUnavailable.get(teacher) ?? new Set();
    const availableSlots = indices.timeSlots.length - unavailable.size;

    if (periodsNeeded > availableSlots) {
      causes.push(
        `Teacher ${teacher} needs ${periodsNeeded} periods but only ` +
        `${availableSlots} slots available`
      );
      suggestions.push(`Increase ${teacher}'s availability`);
      suggestions.push(`Reduce ${teacher}'s teaching load`);
      analysis.push({
        constraint: `teacher_${teacher}_availability`,
        type: 'availability_constraint',
        tension: 'high',
      });
    }
  }

  // Check: Room capacity vs section sizes
  const largestSection = Math.max(...Array.from(indices.sectionStudents.values()));
  const largestRoom = Math.max(...Array.from(indices.roomCapacity.values()));

  if (largestSection > largestRoom) {
    causes.push(
      `Largest section has ${largestSection} students but ` +
      `largest room only holds ${largestRoom}`
    );
    suggestions.push('Add larger rooms');
    suggestions.push('Split large sections');
    analysis.push({
      constraint: 'room_capacity',
      type: 'resource_constraint',
      tension: 'high',
    });
  }

  if (causes.length === 0) {
    causes.push('Could not identify obvious cause');
    suggestions.push('Try relaxing soft constraints');
    suggestions.push('Check for conflicting hard constraints');
  }

  return {
    likely_causes: causes,
    suggestions,
    constraint_analysis: analysis,
  };
}
```

## The Complete Schedule Service

Orchestrate the entire solving process:

```typescript
// src/services/schedule-service.ts

import { query, queryOne, execute } from '../db/client.js';
import { buildIndices } from './model-indexer.js';
import { CompleteModelBuilder } from './complete-model-builder.js';
import { highsSolver } from './highs-solver.js';
import { extractSchedule, validateSchedule } from './solution-extractor.js';
import { diagnoseInfeasibility } from './infeasibility-analyzer.js';
import type { Schedule, Assignment } from '../types/index.js';

export interface GenerateResult {
  success: boolean;
  scheduleId: string;
  status: string;
  objectiveValue: number | null;
  solveTimeMs: number;
  assignmentCount: number;
  errors: string[];
  warnings: string[];
}

export class ScheduleService {
  /**
   * Generate a new schedule
   */
  async generateSchedule(
    name: string,
    semester: string,
    options: {
      timeLimit?: number;
      mipGap?: number;
    } = {}
  ): Promise<GenerateResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create schedule record
    const schedule = await queryOne<Schedule>(
      `INSERT INTO schedules (name, semester, status)
       VALUES ($1, $2, 'draft')
       RETURNING *`,
      [name, semester]
    );

    if (!schedule) {
      throw new Error('Failed to create schedule record');
    }

    try {
      // Load data
      const sections = await this.loadSections();
      const rooms = await this.loadRooms();
      const timeSlots = await this.loadTimeSlots();
      const teachers = await this.loadTeachers();
      const availability = await this.loadAvailability();

      // Build indices
      const indices = buildIndices({
        sections,
        rooms,
        timeSlots,
        teachers,
        availability,
      });

      // Build model
      const builder = new CompleteModelBuilder(indices);
      const model = builder.build();
      const lpFormat = builder.toLPFormat();

      console.log(
        `Model: ${model.variables.length} variables, ` +
        `${model.constraints.length} constraints`
      );

      // Solve
      const result = await highsSolver.solve(lpFormat, {
        timeLimit: options.timeLimit ?? 300,
        mipGap: options.mipGap ?? 0.01,
        presolve: 'on',
      });

      console.log(`Solver finished: ${result.status} in ${result.solveTimeMs}ms`);

      if (result.status === 'Infeasible') {
        const diagnosis = await diagnoseInfeasibility(indices);
        errors.push('Schedule is infeasible');
        errors.push(...diagnosis.likely_causes);
        warnings.push(...diagnosis.suggestions);

        await execute(
          `UPDATE schedules
           SET status = 'draft',
               generated_at = NOW(),
               solver_time = $1
           WHERE id = $2`,
          [result.solveTimeMs, schedule.id]
        );

        return {
          success: false,
          scheduleId: schedule.id,
          status: 'Infeasible',
          objectiveValue: null,
          solveTimeMs: result.solveTimeMs,
          assignmentCount: 0,
          errors,
          warnings,
        };
      }

      if (result.status !== 'Optimal' && result.status !== 'TimeLimit') {
        errors.push(`Solver returned: ${result.status}`);

        return {
          success: false,
          scheduleId: schedule.id,
          status: result.status,
          objectiveValue: null,
          solveTimeMs: result.solveTimeMs,
          assignmentCount: 0,
          errors,
          warnings,
        };
      }

      // Extract and validate solution
      const extracted = extractSchedule(
        result,
        indices.sectionTeacher
      );

      const validation = validateSchedule(extracted, {
        sectionPeriods: indices.sectionPeriods,
        sectionTeacher: indices.sectionTeacher,
      });

      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      // Save assignments
      for (const assignment of extracted.assignments) {
        await execute(
          `INSERT INTO assignments (schedule_id, section_id, room_id, time_slot_id)
           VALUES ($1, $2, $3, $4)`,
          [schedule.id, assignment.sectionId, assignment.roomId, assignment.timeSlotId]
        );
      }

      // Update schedule
      await execute(
        `UPDATE schedules
         SET status = 'draft',
             generated_at = NOW(),
             solver_time = $1,
             objective_value = $2
         WHERE id = $3`,
        [result.solveTimeMs, result.objectiveValue, schedule.id]
      );

      if (result.status === 'TimeLimit') {
        warnings.push('Time limit reached; solution may not be optimal');
      }

      return {
        success: true,
        scheduleId: schedule.id,
        status: result.status,
        objectiveValue: result.objectiveValue,
        solveTimeMs: result.solveTimeMs,
        assignmentCount: extracted.assignments.length,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        scheduleId: schedule.id,
        status: 'Error',
        objectiveValue: null,
        solveTimeMs: 0,
        assignmentCount: 0,
        errors,
        warnings,
      };
    }
  }

  private async loadSections() {
    return query<{
      id: string;
      teacherId: string;
      periodsPerWeek: number;
      maxStudents: number;
      requiresLab: boolean;
    }>(
      `SELECT s.id, s.teacher_id as "teacherId",
              c.periods_per_week as "periodsPerWeek",
              COALESCE(s.max_students, c.max_students) as "maxStudents",
              c.requires_lab as "requiresLab"
       FROM sections s
       JOIN classes c ON c.id = s.class_id`
    );
  }

  private async loadRooms() {
    return query<{ id: string; capacity: number; isLab: boolean }>(
      `SELECT id, capacity, is_lab as "isLab" FROM rooms`
    );
  }

  private async loadTimeSlots() {
    return query<{
      id: string;
      dayOfWeek: number;
      periodNumber: number;
      isBreak: boolean;
    }>(
      `SELECT id, day_of_week as "dayOfWeek",
              period_number as "periodNumber",
              is_break as "isBreak"
       FROM time_slots`
    );
  }

  private async loadTeachers() {
    return query<{ id: string }>('SELECT id FROM teachers');
  }

  private async loadAvailability() {
    return query<{
      teacherId: string;
      periodId: string;
      isAvailable: boolean;
      preference: number;
    }>(
      `SELECT teacher_id as "teacherId",
              period_id as "periodId",
              is_available as "isAvailable",
              preference
       FROM teacher_availability`
    );
  }
}

export const scheduleService = new ScheduleService();
```

## API Endpoint

```typescript
// src/api/routes/schedules.ts
import { Router } from 'express';
import { scheduleService } from '../../services/schedule-service.js';

export const schedulesRouter = Router();

// Generate new schedule
schedulesRouter.post('/generate', async (req, res, next) => {
  try {
    const { name, semester, timeLimit, mipGap } = req.body;

    if (!name || !semester) {
      res.status(400).json({ error: 'name and semester required' });
      return;
    }

    const result = await scheduleService.generateSchedule(name, semester, {
      timeLimit,
      mipGap,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(422).json(result);
    }
  } catch (error) {
    next(error);
  }
});
```

## Next Steps

With the solver integrated, the next chapter builds the user interface for viewing and adjusting schedules.
