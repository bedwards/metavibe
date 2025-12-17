# Modeling the Schedule as ILP

## The Complete Model

Now we put together a full ILP model for school scheduling. This chapter shows the complete formulation with all constraints.

## Variable Indexing

For efficient access, we create indices:

```typescript
// src/services/model-indexer.ts

export interface ModelIndices {
  // Entity lists
  sections: string[];
  rooms: string[];
  timeSlots: string[];
  teachers: string[];

  // Mappings
  sectionTeacher: Map<string, string>;      // section -> teacher
  teacherSections: Map<string, string[]>;    // teacher -> [sections]
  sectionPeriods: Map<string, number>;       // section -> periods needed
  roomCapacity: Map<string, number>;         // room -> capacity
  sectionStudents: Map<string, number>;      // section -> student count
  sectionNeedsLab: Set<string>;              // sections that need lab
  roomIsLab: Set<string>;                    // rooms that are labs
  slotDay: Map<string, number>;              // slot -> day of week
  slotPeriod: Map<string, number>;           // slot -> period number
  daySlots: Map<number, string[]>;           // day -> [slots]

  // Availability
  teacherUnavailable: Map<string, Set<string>>;  // teacher -> unavailable slots
  teacherPreference: Map<string, Map<string, number>>;  // teacher -> slot -> preference
}

export function buildIndices(data: {
  sections: Array<{
    id: string;
    teacherId: string;
    periodsPerWeek: number;
    maxStudents: number;
    requiresLab: boolean;
  }>;
  rooms: Array<{ id: string; capacity: number; isLab: boolean }>;
  timeSlots: Array<{
    id: string;
    dayOfWeek: number;
    periodNumber: number;
    isBreak: boolean;
  }>;
  teachers: Array<{ id: string }>;
  availability: Array<{
    teacherId: string;
    periodId: string;
    isAvailable: boolean;
    preference: number;
  }>;
}): ModelIndices {
  const indices: ModelIndices = {
    sections: data.sections.map((s) => s.id),
    rooms: data.rooms.map((r) => r.id),
    timeSlots: data.timeSlots.filter((t) => !t.isBreak).map((t) => t.id),
    teachers: data.teachers.map((t) => t.id),
    sectionTeacher: new Map(),
    teacherSections: new Map(),
    sectionPeriods: new Map(),
    roomCapacity: new Map(),
    sectionStudents: new Map(),
    sectionNeedsLab: new Set(),
    roomIsLab: new Set(),
    slotDay: new Map(),
    slotPeriod: new Map(),
    daySlots: new Map(),
    teacherUnavailable: new Map(),
    teacherPreference: new Map(),
  };

  // Build section mappings
  for (const section of data.sections) {
    indices.sectionTeacher.set(section.id, section.teacherId);
    indices.sectionPeriods.set(section.id, section.periodsPerWeek);
    indices.sectionStudents.set(section.id, section.maxStudents);
    if (section.requiresLab) {
      indices.sectionNeedsLab.add(section.id);
    }

    // Teacher -> sections
    const teacherSecs = indices.teacherSections.get(section.teacherId) ?? [];
    teacherSecs.push(section.id);
    indices.teacherSections.set(section.teacherId, teacherSecs);
  }

  // Build room mappings
  for (const room of data.rooms) {
    indices.roomCapacity.set(room.id, room.capacity);
    if (room.isLab) {
      indices.roomIsLab.add(room.id);
    }
  }

  // Build time slot mappings
  for (const slot of data.timeSlots) {
    if (slot.isBreak) continue;
    indices.slotDay.set(slot.id, slot.dayOfWeek);
    indices.slotPeriod.set(slot.id, slot.periodNumber);

    const daySlots = indices.daySlots.get(slot.dayOfWeek) ?? [];
    daySlots.push(slot.id);
    indices.daySlots.set(slot.dayOfWeek, daySlots);
  }

  // Build availability mappings
  for (const teacher of data.teachers) {
    indices.teacherUnavailable.set(teacher.id, new Set());
    indices.teacherPreference.set(teacher.id, new Map());
  }

  for (const avail of data.availability) {
    if (!avail.isAvailable) {
      indices.teacherUnavailable.get(avail.teacherId)?.add(avail.periodId);
    }
    indices.teacherPreference.get(avail.teacherId)?.set(avail.periodId, avail.preference);
  }

  return indices;
}
```

## The Complete Model Builder

```typescript
// src/services/complete-model-builder.ts

import type { ModelIndices } from './model-indexer.js';

interface Variable {
  name: string;
  objectiveCoeff: number;
}

interface Constraint {
  name: string;
  terms: Array<{ variable: string; coefficient: number }>;
  sense: '<=' | '=' | '>=';
  rhs: number;
}

export class CompleteModelBuilder {
  private variables: Map<string, Variable> = new Map();
  private constraints: Constraint[] = [];
  private indices: ModelIndices;

  constructor(indices: ModelIndices) {
    this.indices = indices;
  }

  /**
   * Variable naming convention
   */
  private x(section: string, room: string, slot: string): string {
    return `x_${section}_${room}_${slot}`;
  }

  /**
   * Check if assignment is feasible (room compatible with section)
   */
  private isFeasible(section: string, room: string): boolean {
    // Lab check
    if (this.indices.sectionNeedsLab.has(section) &&
        !this.indices.roomIsLab.has(room)) {
      return false;
    }

    // Capacity check
    const capacity = this.indices.roomCapacity.get(room) ?? 0;
    const students = this.indices.sectionStudents.get(section) ?? 0;
    if (capacity < students) {
      return false;
    }

    return true;
  }

  /**
   * Check if time slot is available for section's teacher
   */
  private isAvailable(section: string, slot: string): boolean {
    const teacher = this.indices.sectionTeacher.get(section);
    if (!teacher) return true;

    const unavailable = this.indices.teacherUnavailable.get(teacher);
    return !unavailable?.has(slot);
  }

  /**
   * Build the complete model
   */
  build(): { variables: Variable[]; constraints: Constraint[] } {
    // Step 1: Create variables
    this.createVariables();

    // Step 2: Hard constraints
    this.addNoTeacherConflict();
    this.addNoRoomConflict();
    this.addPeriodsRequired();
    this.addOneSectionPerSlot();

    // Step 3: Soft constraints (objective)
    this.addPreferencePenalties();
    this.addConsecutivePenalties();

    return {
      variables: Array.from(this.variables.values()),
      constraints: this.constraints,
    };
  }

  /**
   * Create all decision variables
   */
  private createVariables(): void {
    for (const section of this.indices.sections) {
      for (const room of this.indices.rooms) {
        if (!this.isFeasible(section, room)) continue;

        for (const slot of this.indices.timeSlots) {
          if (!this.isAvailable(section, slot)) continue;

          const name = this.x(section, room, slot);
          this.variables.set(name, { name, objectiveCoeff: 0 });
        }
      }
    }

    console.log(`Created ${this.variables.size} decision variables`);
  }

  /**
   * HARD: No teacher can teach two sections at same time
   */
  private addNoTeacherConflict(): void {
    for (const [teacher, sections] of this.indices.teacherSections) {
      if (sections.length < 2) continue;

      for (const slot of this.indices.timeSlots) {
        const terms: Array<{ variable: string; coefficient: number }> = [];

        for (const section of sections) {
          for (const room of this.indices.rooms) {
            const varName = this.x(section, room, slot);
            if (this.variables.has(varName)) {
              terms.push({ variable: varName, coefficient: 1 });
            }
          }
        }

        if (terms.length > 1) {
          this.constraints.push({
            name: `no_teacher_conflict_${teacher}_${slot}`,
            terms,
            sense: '<=',
            rhs: 1,
          });
        }
      }
    }
  }

  /**
   * HARD: No room can host two sections at same time
   */
  private addNoRoomConflict(): void {
    for (const room of this.indices.rooms) {
      for (const slot of this.indices.timeSlots) {
        const terms: Array<{ variable: string; coefficient: number }> = [];

        for (const section of this.indices.sections) {
          const varName = this.x(section, room, slot);
          if (this.variables.has(varName)) {
            terms.push({ variable: varName, coefficient: 1 });
          }
        }

        if (terms.length > 1) {
          this.constraints.push({
            name: `no_room_conflict_${room}_${slot}`,
            terms,
            sense: '<=',
            rhs: 1,
          });
        }
      }
    }
  }

  /**
   * HARD: Each section gets exactly required number of periods
   */
  private addPeriodsRequired(): void {
    for (const section of this.indices.sections) {
      const required = this.indices.sectionPeriods.get(section) ?? 0;
      const terms: Array<{ variable: string; coefficient: number }> = [];

      for (const room of this.indices.rooms) {
        for (const slot of this.indices.timeSlots) {
          const varName = this.x(section, room, slot);
          if (this.variables.has(varName)) {
            terms.push({ variable: varName, coefficient: 1 });
          }
        }
      }

      if (terms.length > 0) {
        this.constraints.push({
          name: `periods_required_${section}`,
          terms,
          sense: '=',
          rhs: required,
        });
      }
    }
  }

  /**
   * HARD: Each section uses at most one room per time slot
   * (Prevents double-booking within same section)
   */
  private addOneSectionPerSlot(): void {
    for (const section of this.indices.sections) {
      for (const slot of this.indices.timeSlots) {
        const terms: Array<{ variable: string; coefficient: number }> = [];

        for (const room of this.indices.rooms) {
          const varName = this.x(section, room, slot);
          if (this.variables.has(varName)) {
            terms.push({ variable: varName, coefficient: 1 });
          }
        }

        if (terms.length > 1) {
          this.constraints.push({
            name: `one_room_per_slot_${section}_${slot}`,
            terms,
            sense: '<=',
            rhs: 1,
          });
        }
      }
    }
  }

  /**
   * SOFT: Penalize scheduling at dispreferred times
   */
  private addPreferencePenalties(): void {
    const PREFERENCE_WEIGHT = 5;

    for (const section of this.indices.sections) {
      const teacher = this.indices.sectionTeacher.get(section);
      if (!teacher) continue;

      const preferences = this.indices.teacherPreference.get(teacher);
      if (!preferences) continue;

      for (const [slot, preference] of preferences) {
        if (preference >= 0) continue; // No penalty for neutral/preferred

        const penalty = Math.abs(preference) * PREFERENCE_WEIGHT;

        for (const room of this.indices.rooms) {
          const varName = this.x(section, room, slot);
          const variable = this.variables.get(varName);
          if (variable) {
            variable.objectiveCoeff += penalty;
          }
        }
      }
    }
  }

  /**
   * SOFT: Penalize consecutive periods beyond threshold
   */
  private addConsecutivePenalties(): void {
    const MAX_CONSECUTIVE = 3;
    const CONSECUTIVE_WEIGHT = 10;

    // For each teacher, for each day, check consecutive sequences
    for (const [teacher, sections] of this.indices.teacherSections) {
      for (const [day, slots] of this.indices.daySlots) {
        // Sort slots by period number
        const sortedSlots = slots.sort((a, b) => {
          const pA = this.indices.slotPeriod.get(a) ?? 0;
          const pB = this.indices.slotPeriod.get(b) ?? 0;
          return pA - pB;
        });

        // Check each window of MAX_CONSECUTIVE + 1 periods
        for (let i = 0; i <= sortedSlots.length - MAX_CONSECUTIVE - 1; i++) {
          const windowSlots = sortedSlots.slice(i, i + MAX_CONSECUTIVE + 1);

          // Create auxiliary variable for this violation
          const auxName = `consec_${teacher}_${day}_${i}`;
          this.variables.set(auxName, {
            name: auxName,
            objectiveCoeff: CONSECUTIVE_WEIGHT,
          });

          // Constraint: sum of assignments in window <= MAX_CONSECUTIVE + aux
          const terms: Array<{ variable: string; coefficient: number }> = [];

          for (const slot of windowSlots) {
            for (const section of sections) {
              for (const room of this.indices.rooms) {
                const varName = this.x(section, room, slot);
                if (this.variables.has(varName)) {
                  terms.push({ variable: varName, coefficient: 1 });
                }
              }
            }
          }

          terms.push({ variable: auxName, coefficient: -1 });

          this.constraints.push({
            name: `consecutive_${teacher}_${day}_${i}`,
            terms,
            sense: '<=',
            rhs: MAX_CONSECUTIVE,
          });
        }
      }
    }
  }

  /**
   * Export to LP format
   */
  toLPFormat(): string {
    const lines: string[] = [];

    // Objective
    lines.push('Minimize');
    const objTerms = Array.from(this.variables.values())
      .filter((v) => v.objectiveCoeff !== 0)
      .map((v) => {
        const coeff = v.objectiveCoeff;
        return coeff === 1 ? v.name : `${coeff} ${v.name}`;
      });
    lines.push(` obj: ${objTerms.join(' + ') || '0'}`);

    // Constraints
    lines.push('Subject To');
    for (const c of this.constraints) {
      const termStrs = c.terms.map((t) => {
        if (t.coefficient === 1) return t.variable;
        if (t.coefficient === -1) return `- ${t.variable}`;
        return `${t.coefficient} ${t.variable}`;
      });
      lines.push(` ${c.name}: ${termStrs.join(' + ')} ${c.sense} ${c.rhs}`);
    }

    // Bounds (all binary are 0-1)
    lines.push('Bounds');
    for (const v of this.variables.values()) {
      lines.push(` 0 <= ${v.name} <= 1`);
    }

    // Binary
    lines.push('Binary');
    const binaryVars = Array.from(this.variables.keys())
      .filter((name) => name.startsWith('x_'));
    // Split into lines of reasonable length
    for (let i = 0; i < binaryVars.length; i += 10) {
      lines.push(` ${binaryVars.slice(i, i + 10).join(' ')}`);
    }

    // General (integer) for auxiliary variables
    const intVars = Array.from(this.variables.keys())
      .filter((name) => !name.startsWith('x_'));
    if (intVars.length > 0) {
      lines.push('General');
      lines.push(` ${intVars.join(' ')}`);
    }

    lines.push('End');

    return lines.join('\n');
  }
}
```

## Constraint Counting

Before solving, it's useful to know the model size:

```typescript
export function countModel(model: { variables: Variable[]; constraints: Constraint[] }): {
  variables: number;
  binaryVariables: number;
  constraints: number;
  nonZeroCoefficients: number;
} {
  const binary = model.variables.filter((v) => v.name.startsWith('x_')).length;
  const nonZero = model.constraints.reduce(
    (sum, c) => sum + c.terms.length,
    0
  );

  return {
    variables: model.variables.length,
    binaryVariables: binary,
    constraints: model.constraints.length,
    nonZeroCoefficients: nonZero,
  };
}
```

Typical sizes for a medium school:
- 100 sections, 30 rooms, 40 slots
- ~50,000 binary variables (after feasibility filtering)
- ~5,000 constraints
- ~200,000 non-zero coefficients

Modern ILP solvers handle this in seconds.

## Testing the Model

Validate the model before solving:

```typescript
// src/services/model-validator.ts

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateModel(model: {
  variables: Variable[];
  constraints: Constraint[];
}, indices: ModelIndices): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check: Every section has at least one possible assignment
  for (const section of indices.sections) {
    const possibleAssignments = model.variables.filter(
      (v) => v.name.startsWith(`x_${section}_`)
    );

    if (possibleAssignments.length === 0) {
      errors.push(`Section ${section} has no feasible room/slot combinations`);
    }

    const periodsRequired = indices.sectionPeriods.get(section) ?? 0;
    if (possibleAssignments.length < periodsRequired) {
      warnings.push(
        `Section ${section} needs ${periodsRequired} periods but only ` +
        `${possibleAssignments.length} combinations are feasible`
      );
    }
  }

  // Check: Constraint references valid variables
  const varNames = new Set(model.variables.map((v) => v.name));
  for (const constraint of model.constraints) {
    for (const term of constraint.terms) {
      if (!varNames.has(term.variable)) {
        errors.push(
          `Constraint ${constraint.name} references unknown variable ${term.variable}`
        );
      }
    }
  }

  // Check: No contradictory constraints
  const periodsConstraints = model.constraints.filter(
    (c) => c.name.startsWith('periods_required_')
  );
  for (const constraint of periodsConstraints) {
    if (constraint.terms.length < constraint.rhs) {
      const section = constraint.name.replace('periods_required_', '');
      errors.push(
        `Section ${section} requires ${constraint.rhs} periods but only ` +
        `${constraint.terms.length} options exist`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

## Next Steps

With the model built, the next chapter integrates the HiGHS solver—feeding it the LP format and extracting the solution.
