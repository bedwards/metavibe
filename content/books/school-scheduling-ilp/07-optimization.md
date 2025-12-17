# Advanced Optimization

## Scaling to Larger Schools

The basic ILP model works well for small to medium schools (up to ~200 sections). Larger schools need optimization techniques.

## Model Reduction

### Variable Filtering

Remove variables that can never be selected:

```typescript
// src/services/model-reducer.ts

export function filterVariables(
  sections: Array<{
    id: string;
    teacherId: string;
    requiresLab: boolean;
    maxStudents: number;
  }>,
  rooms: Array<{ id: string; capacity: number; isLab: boolean }>,
  timeSlots: Array<{ id: string; isBreak: boolean }>,
  teacherUnavailable: Map<string, Set<string>>
): Array<{ sectionId: string; roomId: string; slotId: string }> {
  const variables: Array<{ sectionId: string; roomId: string; slotId: string }> = [];

  for (const section of sections) {
    const unavailable = teacherUnavailable.get(section.teacherId) ?? new Set();

    for (const room of rooms) {
      // Filter: Lab requirement
      if (section.requiresLab && !room.isLab) continue;

      // Filter: Capacity
      if (room.capacity < section.maxStudents) continue;

      for (const slot of timeSlots) {
        // Filter: Breaks
        if (slot.isBreak) continue;

        // Filter: Teacher availability
        if (unavailable.has(slot.id)) continue;

        variables.push({
          sectionId: section.id,
          roomId: room.id,
          slotId: slot.id,
        });
      }
    }
  }

  return variables;
}
```

### Aggregation

Combine similar constraints:

```typescript
// Instead of one constraint per teacher-slot pair,
// aggregate where possible

function aggregateConstraints(constraints: Constraint[]): Constraint[] {
  // Group constraints by structure
  const groups = new Map<string, Constraint[]>();

  for (const c of constraints) {
    const key = `${c.sense}_${c.rhs}_${c.terms.length}`;
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }

  // For identical constraints, keep only one
  const unique: Constraint[] = [];

  for (const [, group] of groups) {
    const seen = new Set<string>();

    for (const c of group) {
      const signature = c.terms
        .map((t) => t.variable)
        .sort()
        .join(',');

      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(c);
      }
    }
  }

  return unique;
}
```

## Iterative Solving

For very large problems, solve in phases:

```typescript
// src/services/iterative-solver.ts

export async function solveIteratively(
  fullModel: { variables: Variable[]; constraints: Constraint[] },
  options: {
    phaseTimeLimit: number;
    maxPhases: number;
  }
): Promise<SolverResult> {
  // Phase 1: Solve a relaxed version (fewer constraints)
  const relaxedModel = createRelaxedModel(fullModel);

  const phase1Result = await highsSolver.solve(
    toLPFormat(relaxedModel),
    { timeLimit: options.phaseTimeLimit }
  );

  if (phase1Result.status === 'Infeasible') {
    return phase1Result; // Problem is fundamentally infeasible
  }

  // Phase 2: Fix some variables based on phase 1 solution
  let currentModel = fullModel;
  let currentSolution = phase1Result.solution;

  for (let phase = 2; phase <= options.maxPhases; phase++) {
    // Fix "obvious" assignments from previous solution
    const fixedModel = fixHighConfidenceVariables(
      currentModel,
      currentSolution,
      0.95 // Fix variables with value > 0.95
    );

    const result = await highsSolver.solve(
      toLPFormat(fixedModel),
      { timeLimit: options.phaseTimeLimit }
    );

    if (result.status === 'Infeasible') {
      // Backtrack: some fixed variables were wrong
      // Unfix and try again with fewer fixed
      continue;
    }

    currentSolution = result.solution;

    if (result.status === 'Optimal') {
      return result;
    }
  }

  // Return best found solution
  return {
    status: 'Feasible',
    objectiveValue: computeObjective(fullModel, currentSolution),
    solution: currentSolution,
    solveTimeMs: 0, // Would track across phases
    iterations: 0,
    nodes: 0,
  };
}

function createRelaxedModel(full: {
  variables: Variable[];
  constraints: Constraint[];
}): { variables: Variable[]; constraints: Constraint[] } {
  // Remove soft constraint penalties from objective
  // Keep only hard constraints
  return {
    variables: full.variables.map((v) => ({
      ...v,
      objectiveCoeff: 0, // Ignore preferences in phase 1
    })),
    constraints: full.constraints.filter(
      (c) => !c.name.startsWith('soft_')
    ),
  };
}

function fixHighConfidenceVariables(
  model: { variables: Variable[]; constraints: Constraint[] },
  solution: Map<string, number>,
  threshold: number
): { variables: Variable[]; constraints: Constraint[] } {
  const fixedVariables = model.variables.map((v) => {
    const value = solution.get(v.name) ?? 0;

    if (value >= threshold) {
      return { ...v, lowerBound: 1, upperBound: 1 }; // Fix to 1
    }
    if (value <= 1 - threshold) {
      return { ...v, lowerBound: 0, upperBound: 0 }; // Fix to 0
    }

    return v; // Keep as variable
  });

  return { variables: fixedVariables, constraints: model.constraints };
}
```

## Multi-Objective Optimization

Real scheduling has competing goals:
- Minimize teacher conflicts (hard)
- Honor preferences (soft)
- Balance loads (soft)
- Keep classes in same room (soft)

### Weighted Sum Approach

Combine objectives into one:

```typescript
// Already used in basic model
const totalObjective =
  10 * conflictPenalties +
  5 * preferencePenalties +
  1 * roomChangePenalties;
```

### Hierarchical Approach

Solve in priority order:

```typescript
async function solveHierarchically(
  model: ILPModel,
  objectives: Array<{
    name: string;
    priority: number;
    coefficients: Map<string, number>;
    tolerance: number; // Allow degradation from optimal
  }>
): Promise<SolverResult> {
  // Sort by priority
  objectives.sort((a, b) => b.priority - a.priority);

  let constrainedModel = model;

  for (const obj of objectives) {
    // Set this objective
    const modelWithObj = setObjective(constrainedModel, obj.coefficients);

    // Solve
    const result = await highsSolver.solve(toLPFormat(modelWithObj));

    if (result.status !== 'Optimal') {
      return result; // Infeasible for this objective
    }

    // Add constraint: this objective must be within tolerance of optimal
    constrainedModel = addObjectiveConstraint(
      constrainedModel,
      obj.coefficients,
      result.objectiveValue! * (1 + obj.tolerance)
    );
  }

  // Final solve with all constraints
  return highsSolver.solve(toLPFormat(constrainedModel));
}
```

## Performance Tuning

### Solver Options

```typescript
const performanceOptions: SolverOptions = {
  // Time limit prevents runaway solving
  timeLimit: 300, // 5 minutes

  // Accept solutions within 1% of optimal
  mipGap: 0.01,

  // Use all available threads
  threads: 0, // 0 = auto-detect

  // Presolve often helps dramatically
  presolve: 'on',
};
```

### Model Statistics

Monitor model size:

```typescript
function logModelStats(model: {
  variables: Variable[];
  constraints: Constraint[];
}): void {
  const binaryVars = model.variables.filter(
    (v) => v.upperBound === 1 && v.lowerBound === 0
  ).length;

  const nonZeros = model.constraints.reduce(
    (sum, c) => sum + c.terms.length,
    0
  );

  console.log(`Model Statistics:
  Variables: ${model.variables.length}
  Binary variables: ${binaryVars}
  Constraints: ${model.constraints.length}
  Non-zero coefficients: ${nonZeros}
  Density: ${(nonZeros / (model.variables.length * model.constraints.length) * 100).toFixed(2)}%`);
}
```

### Warm Starting

Reuse previous solutions:

```typescript
async function solveWithWarmStart(
  model: ILPModel,
  previousSolution: Map<string, number>
): Promise<SolverResult> {
  // HiGHS supports warm starting via MIP start
  // Format the previous solution

  const mipStart = Array.from(previousSolution.entries())
    .filter(([name]) => name.startsWith('x_'))
    .map(([name, value]) => `${name} ${value}`)
    .join('\n');

  const lpWithStart = toLPFormat(model) + '\n' + mipStart;

  return highsSolver.solve(lpWithStart, {
    // Enable warm start
  });
}
```

## Real-World Deployment

### Database Optimization

For large schools, optimize queries:

```sql
-- Create indexes for common access patterns
CREATE INDEX idx_assignments_schedule_slot
  ON assignments(schedule_id, time_slot_id);

CREATE INDEX idx_sections_teacher_class
  ON sections(teacher_id, class_id);

-- Materialized view for schedule grid
CREATE MATERIALIZED VIEW schedule_grid AS
SELECT
  a.schedule_id,
  a.time_slot_id,
  t.day_of_week,
  t.period_number,
  t.start_time,
  t.end_time,
  a.room_id,
  r.name as room_name,
  a.section_id,
  c.code as class_code,
  c.name as class_name,
  s.teacher_id,
  te.name as teacher_name
FROM assignments a
JOIN time_slots t ON t.id = a.time_slot_id
JOIN rooms r ON r.id = a.room_id
JOIN sections s ON s.id = a.section_id
JOIN classes c ON c.id = s.class_id
JOIN teachers te ON te.id = s.teacher_id;

-- Refresh after schedule generation
REFRESH MATERIALIZED VIEW schedule_grid;
```

### Background Job Processing

Run solving asynchronously:

```typescript
// src/services/job-queue.ts
import { scheduleService } from './schedule-service.js';

interface ScheduleJob {
  id: string;
  scheduleId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result: GenerateResult | null;
  error: string | null;
}

const jobs = new Map<string, ScheduleJob>();

export async function queueScheduleGeneration(
  name: string,
  semester: string,
  options: { timeLimit?: number } = {}
): Promise<string> {
  const jobId = crypto.randomUUID();

  jobs.set(jobId, {
    id: jobId,
    scheduleId: '',
    status: 'pending',
    progress: 0,
    result: null,
    error: null,
  });

  // Run in background
  setImmediate(async () => {
    const job = jobs.get(jobId)!;
    job.status = 'running';

    try {
      const result = await scheduleService.generateSchedule(
        name,
        semester,
        options
      );

      job.status = 'completed';
      job.scheduleId = result.scheduleId;
      job.result = result;
      job.progress = 100;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
  });

  return jobId;
}

export function getJobStatus(jobId: string): ScheduleJob | null {
  return jobs.get(jobId) ?? null;
}
```

### API for Job Status

```typescript
// Start generation (returns job ID)
schedulesRouter.post('/generate/async', async (req, res) => {
  const { name, semester, timeLimit } = req.body;
  const jobId = await queueScheduleGeneration(name, semester, { timeLimit });
  res.json({ jobId });
});

// Check job status
schedulesRouter.get('/generate/status/:jobId', (req, res) => {
  const job = getJobStatus(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});
```

## What You've Built

A complete school scheduling system with:

- **Data model** for teachers, classes, rooms, and constraints
- **ILP formulation** expressing scheduling as optimization
- **HiGHS integration** for solving
- **Web interface** for viewing and adjusting schedules
- **Export** to calendar formats
- **Performance optimization** for large schools

## Going Further

Ideas for extending:
- **Student conflicts** - Track which students take which sections
- **Department grouping** - Keep same department classes nearby
- **Room preferences** - Teachers prefer certain rooms
- **Multi-week rotation** - Different schedules for different weeks
- **Substitute handling** - Reschedule when teachers are absent
- **What-if analysis** - Preview impact of changes before committing

The ILP foundation supports all these extensions by adding variables and constraints.

## The Power of ILP

School scheduling is one of many problems that ILP solves elegantly:
- Employee shift scheduling
- Sports league fixtures
- Exam timetabling
- Resource allocation
- Vehicle routing
- Production planning

The pattern is always the same:
1. Define decision variables
2. Express constraints as linear equations
3. Define an objective
4. Let the solver find the optimal solution

You've learned to think in constraints. Apply this to your next optimization challenge.
