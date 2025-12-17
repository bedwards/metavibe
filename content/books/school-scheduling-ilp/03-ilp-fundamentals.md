# ILP Fundamentals

## What is Linear Programming?

Linear Programming (LP) is a mathematical technique for optimization. You have:

1. **Decision variables** - What you're trying to determine
2. **Objective function** - What you're optimizing (minimize or maximize)
3. **Constraints** - Rules the solution must satisfy

All relationships must be linear—no multiplication of variables, no exponents, no trigonometry.

### A Simple Example

Imagine a factory making chairs and tables:
- Each chair requires 2 hours of labor, earns $20 profit
- Each table requires 4 hours of labor, earns $50 profit
- You have 40 hours of labor available

**Question**: How many chairs and tables should you make to maximize profit?

**Variables**:
- x = number of chairs
- y = number of tables

**Objective** (maximize):
```
20x + 50y
```

**Constraints**:
```
2x + 4y ≤ 40    (labor hours)
x ≥ 0           (can't make negative chairs)
y ≥ 0           (can't make negative tables)
```

LP solvers find the optimal solution: x=0, y=10 (make only tables, profit=$500).

## Integer Linear Programming

Standard LP allows fractional solutions (x=3.7 chairs). For scheduling, we need whole numbers—you can't have half a class.

**Integer Linear Programming (ILP)** adds the constraint that some or all variables must be integers.

**Binary variables** are a special case: variables that can only be 0 or 1. Perfect for yes/no decisions:
- Does teacher T teach section S in room R at time T? (0=no, 1=yes)

ILP is much harder to solve than LP. LP has polynomial-time algorithms; ILP is NP-hard. But modern solvers handle surprisingly large problems.

## Decision Variables for Scheduling

For school scheduling, we define binary variables:

```
x[s,r,t] = 1 if section s is assigned to room r at time slot t
         = 0 otherwise
```

For a school with:
- 100 sections
- 30 rooms
- 40 time slots (8 periods × 5 days)

We have 100 × 30 × 40 = 120,000 variables.

That sounds like a lot, but ILP solvers routinely handle millions of variables.

## The Objective Function

The objective tells the solver what to optimize. For scheduling:

**Option 1: Minimize constraint violations**
```
minimize: sum of all soft constraint penalties
```

**Option 2: Maximize preference satisfaction**
```
maximize: sum of all preference scores
```

**Option 3: Combined**
```
minimize: (soft constraint penalties) - (preference scores)
```

Example objective function:

```
minimize:
  10 × (consecutive period violations) +
   5 × (teacher preference violations) +
   1 × (room preference violations)
```

The coefficients (10, 5, 1) determine relative importance.

## Hard Constraints

Hard constraints must be satisfied. If any is violated, the solution is infeasible.

### No Double-Booking Teachers

A teacher can't teach two sections at the same time:

```
For each teacher T and time slot t:
  sum over all sections s taught by T, all rooms r:
    x[s,r,t] ≤ 1
```

In math notation:
```
∑(s∈sections_of_T) ∑(r∈rooms) x[s,r,t] ≤ 1   ∀T, ∀t
```

### No Double-Booking Rooms

A room can't host two sections at the same time:

```
For each room r and time slot t:
  sum over all sections s:
    x[s,r,t] ≤ 1
```

### Each Section Gets Required Periods

If section s needs 5 periods per week:

```
For each section s:
  sum over all rooms r, all time slots t:
    x[s,r,t] = periods_required[s]
```

### Teacher Availability

If teacher T is unavailable at time t, no section taught by T can be scheduled then:

```
For each teacher T, each time slot t where T is unavailable:
  sum over all sections s taught by T, all rooms r:
    x[s,r,t] = 0
```

### Room Capacity

Section s can't be in room r if capacity is insufficient:

```
For each section s, each room r where capacity[r] < students[s]:
  sum over all time slots t:
    x[s,r,t] = 0
```

### Lab Requirements

Lab sections must be in lab rooms:

```
For each section s that requires a lab, each non-lab room r:
  sum over all time slots t:
    x[s,r,t] = 0
```

## Soft Constraints with Penalties

Soft constraints use auxiliary variables to measure violations.

### Teacher Consecutive Periods

Penalize teachers working more than 3 consecutive periods.

Define auxiliary variable:
```
consec[T,d,p] = 1 if teacher T teaches 4+ consecutive periods
               starting at day d, period p
```

Add constraint:
```
For each teacher T, day d, starting period p:
  sum over periods p to p+3, all sections s of T, all rooms r:
    x[s,r,t(d,p)] + x[s,r,t(d,p+1)] + x[s,r,t(d,p+2)] + x[s,r,t(d,p+3)]
    ≤ 3 + consec[T,d,p]
```

Add to objective:
```
minimize: ... + 10 × sum of all consec[T,d,p]
```

### Period Preferences

If teacher T prefers period p (preference=2) and dislikes period q (preference=-2):

Define preference violation:
```
pref_viol[T,t] = 1 if teacher T is scheduled at dispreferred time t
```

Add constraint:
```
For each teacher T, dispreferred time t:
  sum over sections s of T, rooms r:
    x[s,r,t] ≤ pref_viol[T,t]
```

Add to objective:
```
minimize: ... + 5 × sum of pref_viol[T,t] × (-preference[T,t])
```

## Building the Model in Code

```typescript
// src/services/ilp-builder.ts

import type {
  ILPVariable,
  ILPConstraint,
  ILPModel,
  Section,
  Room,
  TimeSlot,
  Teacher,
  TeacherAvailability,
} from '../types/index.js';

export class ILPBuilder {
  private variables: Map<string, ILPVariable> = new Map();
  private constraints: ILPConstraint[] = [];
  private objectiveCoefficients: Map<string, number> = new Map();

  /**
   * Create assignment variable name
   */
  private varName(sectionId: string, roomId: string, slotId: string): string {
    return `x_${sectionId}_${roomId}_${slotId}`;
  }

  /**
   * Build the complete ILP model
   */
  async build(data: {
    sections: Array<Section & {
      teacherId: string;
      periodsPerWeek: number;
      requiresLab: boolean;
      maxStudents: number;
    }>;
    rooms: Room[];
    timeSlots: TimeSlot[];
    teachers: Teacher[];
    teacherAvailability: Map<string, TeacherAvailability[]>;
  }): Promise<ILPModel> {
    // Clear previous model
    this.variables.clear();
    this.constraints = [];
    this.objectiveCoefficients.clear();

    // Create decision variables
    this.createVariables(data.sections, data.rooms, data.timeSlots);

    // Add hard constraints
    this.addTeacherConflictConstraints(data.sections, data.rooms, data.timeSlots);
    this.addRoomConflictConstraints(data.sections, data.rooms, data.timeSlots);
    this.addPeriodsRequiredConstraints(data.sections, data.rooms, data.timeSlots);
    this.addTeacherAvailabilityConstraints(
      data.sections,
      data.rooms,
      data.timeSlots,
      data.teacherAvailability
    );
    this.addRoomCapacityConstraints(data.sections, data.rooms, data.timeSlots);
    this.addLabRequirementConstraints(data.sections, data.rooms, data.timeSlots);

    // Add soft constraint penalties
    this.addPreferencePenalties(
      data.sections,
      data.rooms,
      data.timeSlots,
      data.teacherAvailability
    );

    return {
      variables: Array.from(this.variables.values()),
      constraints: this.constraints,
      objective: 'minimize',
    };
  }

  /**
   * Create binary decision variables
   */
  private createVariables(
    sections: Array<{ id: string; requiresLab: boolean; maxStudents: number }>,
    rooms: Room[],
    timeSlots: TimeSlot[]
  ): void {
    for (const section of sections) {
      for (const room of rooms) {
        // Skip incompatible room-section pairs
        if (section.requiresLab && !room.isLab) continue;
        if (room.capacity < section.maxStudents) continue;

        for (const slot of timeSlots) {
          if (slot.isBreak) continue;

          const name = this.varName(section.id, room.id, slot.id);
          this.variables.set(name, {
            name,
            type: 'binary',
            lowerBound: 0,
            upperBound: 1,
            objectiveCoefficient: 0, // Set later
          });
        }
      }
    }
  }

  /**
   * No teacher teaches two sections at same time
   */
  private addTeacherConflictConstraints(
    sections: Array<{ id: string; teacherId: string }>,
    rooms: Room[],
    timeSlots: TimeSlot[]
  ): void {
    // Group sections by teacher
    const sectionsByTeacher = new Map<string, string[]>();
    for (const section of sections) {
      const list = sectionsByTeacher.get(section.teacherId) ?? [];
      list.push(section.id);
      sectionsByTeacher.set(section.teacherId, list);
    }

    for (const [teacherId, sectionIds] of sectionsByTeacher) {
      if (sectionIds.length < 2) continue; // No conflict possible

      for (const slot of timeSlots) {
        if (slot.isBreak) continue;

        const coefficients = new Map<string, number>();

        for (const sectionId of sectionIds) {
          for (const room of rooms) {
            const varName = this.varName(sectionId, room.id, slot.id);
            if (this.variables.has(varName)) {
              coefficients.set(varName, 1);
            }
          }
        }

        if (coefficients.size > 0) {
          this.constraints.push({
            name: `teacher_conflict_${teacherId}_${slot.id}`,
            coefficients,
            sense: '<=',
            rhs: 1,
          });
        }
      }
    }
  }

  /**
   * No room hosts two sections at same time
   */
  private addRoomConflictConstraints(
    sections: Array<{ id: string }>,
    rooms: Room[],
    timeSlots: TimeSlot[]
  ): void {
    for (const room of rooms) {
      for (const slot of timeSlots) {
        if (slot.isBreak) continue;

        const coefficients = new Map<string, number>();

        for (const section of sections) {
          const varName = this.varName(section.id, room.id, slot.id);
          if (this.variables.has(varName)) {
            coefficients.set(varName, 1);
          }
        }

        if (coefficients.size > 1) {
          this.constraints.push({
            name: `room_conflict_${room.id}_${slot.id}`,
            coefficients,
            sense: '<=',
            rhs: 1,
          });
        }
      }
    }
  }

  /**
   * Each section gets exactly required periods
   */
  private addPeriodsRequiredConstraints(
    sections: Array<{ id: string; periodsPerWeek: number }>,
    rooms: Room[],
    timeSlots: TimeSlot[]
  ): void {
    for (const section of sections) {
      const coefficients = new Map<string, number>();

      for (const room of rooms) {
        for (const slot of timeSlots) {
          if (slot.isBreak) continue;

          const varName = this.varName(section.id, room.id, slot.id);
          if (this.variables.has(varName)) {
            coefficients.set(varName, 1);
          }
        }
      }

      if (coefficients.size > 0) {
        this.constraints.push({
          name: `periods_required_${section.id}`,
          coefficients,
          sense: '=',
          rhs: section.periodsPerWeek,
        });
      }
    }
  }

  /**
   * Teachers can't teach when unavailable
   */
  private addTeacherAvailabilityConstraints(
    sections: Array<{ id: string; teacherId: string }>,
    rooms: Room[],
    timeSlots: TimeSlot[],
    teacherAvailability: Map<string, TeacherAvailability[]>
  ): void {
    for (const section of sections) {
      const availability = teacherAvailability.get(section.teacherId) ?? [];

      for (const avail of availability) {
        if (avail.isAvailable) continue; // Only constrain unavailable slots

        for (const room of rooms) {
          const varName = this.varName(section.id, room.id, avail.periodId);
          if (this.variables.has(varName)) {
            // Set upper bound to 0 (can't be selected)
            const variable = this.variables.get(varName)!;
            variable.upperBound = 0;
          }
        }
      }
    }
  }

  /**
   * Section can't be in room with insufficient capacity
   */
  private addRoomCapacityConstraints(
    sections: Array<{ id: string; maxStudents: number }>,
    rooms: Room[],
    timeSlots: TimeSlot[]
  ): void {
    // Already handled in createVariables by not creating variables
    // for incompatible pairs
  }

  /**
   * Lab sections must be in lab rooms
   */
  private addLabRequirementConstraints(
    sections: Array<{ id: string; requiresLab: boolean }>,
    rooms: Room[],
    timeSlots: TimeSlot[]
  ): void {
    // Already handled in createVariables by not creating variables
    // for incompatible pairs
  }

  /**
   * Add penalties for violating preferences
   */
  private addPreferencePenalties(
    sections: Array<{ id: string; teacherId: string }>,
    rooms: Room[],
    timeSlots: TimeSlot[],
    teacherAvailability: Map<string, TeacherAvailability[]>
  ): void {
    // Penalty for scheduling at dispreferred times
    for (const section of sections) {
      const availability = teacherAvailability.get(section.teacherId) ?? [];

      for (const avail of availability) {
        if (!avail.isAvailable) continue; // Already hard-constrained
        if (avail.preference >= 0) continue; // No penalty for neutral/preferred

        // Negative preference = penalty
        const penalty = Math.abs(avail.preference);

        for (const room of rooms) {
          const varName = this.varName(section.id, room.id, avail.periodId);
          if (this.variables.has(varName)) {
            const current = this.objectiveCoefficients.get(varName) ?? 0;
            this.objectiveCoefficients.set(varName, current + penalty);

            const variable = this.variables.get(varName)!;
            variable.objectiveCoefficient = this.objectiveCoefficients.get(varName)!;
          }
        }
      }
    }
  }

  /**
   * Convert model to LP format string for solver
   */
  toLPFormat(model: ILPModel): string {
    const lines: string[] = [];

    // Objective
    lines.push('Minimize');
    const objTerms = model.variables
      .filter((v) => v.objectiveCoefficient !== 0)
      .map((v) => `${v.objectiveCoefficient} ${v.name}`)
      .join(' + ');
    lines.push(` obj: ${objTerms || '0'}`);

    // Constraints
    lines.push('Subject To');
    for (const constraint of model.constraints) {
      const terms = Array.from(constraint.coefficients.entries())
        .map(([name, coef]) => `${coef} ${name}`)
        .join(' + ');
      const sense = constraint.sense === '<=' ? '<=' : constraint.sense === '>=' ? '>=' : '=';
      lines.push(` ${constraint.name}: ${terms} ${sense} ${constraint.rhs}`);
    }

    // Bounds
    lines.push('Bounds');
    for (const variable of model.variables) {
      lines.push(` ${variable.lowerBound} <= ${variable.name} <= ${variable.upperBound}`);
    }

    // Binary variables
    lines.push('Binary');
    const binaryVars = model.variables
      .filter((v) => v.type === 'binary')
      .map((v) => v.name);
    lines.push(` ${binaryVars.join(' ')}`);

    lines.push('End');

    return lines.join('\n');
  }
}

export const ilpBuilder = new ILPBuilder();
```

## Understanding the Math

The key insight: every constraint becomes a linear equation.

**"No double-booking"** becomes a sum constraint:
```
(all assignments for teacher T at time t) ≤ 1
```

**"Exactly N periods"** becomes an equality:
```
(all assignments for section S) = N
```

**"Prefer mornings"** becomes an objective term:
```
penalty × (assignments at afternoon slots)
```

The solver explores the space of all 0/1 combinations for the variables, using branch-and-bound and cutting planes to eliminate infeasible regions efficiently.

## Why ILP Works Well for Scheduling

1. **Complete search**: Unlike heuristics, ILP proves optimality or infeasibility
2. **Flexible constraints**: Any linear constraint can be added
3. **Weighted objectives**: Balance multiple competing goals
4. **Incremental solving**: Add constraints without rebuilding
5. **Proven technology**: Decades of algorithmic improvements

The downside: model building requires care. Bugs in constraints cause incorrect or infeasible solutions with opaque error messages.

## Next Steps

With the fundamentals covered, the next chapter shows how to model the complete scheduling problem as an ILP—turning business requirements into mathematical constraints.
