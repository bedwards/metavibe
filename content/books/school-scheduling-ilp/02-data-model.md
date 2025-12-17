# The Scheduling Data Model

## Entities and Relationships

School scheduling revolves around answering one question: "When does who teach what where?"

The entities:
- **Teachers** - Who teaches
- **Classes** - What is taught (course definitions)
- **Sections** - Instances of classes (Algebra I has 3 sections)
- **Rooms** - Where teaching happens
- **Time Slots** - When teaching happens

The relationships form a web of constraints.

```
                    ┌──────────────┐
                    │   Teacher    │
                    │ - name       │
                    │ - department │
                    │ - maxPeriods │
                    └──────┬───────┘
                           │
                           │ teaches
                           ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Class     │───▶│   Section    │◀───│    Room      │
│ - name       │    │ - number     │    │ - capacity   │
│ - code       │    │ - students   │    │ - equipment  │
│ - labNeeded  │    └──────┬───────┘    └──────────────┘
└──────────────┘           │
                           │ scheduled at
                           ▼
                    ┌──────────────┐
                    │  Time Slot   │
                    │ - day        │
                    │ - period     │
                    │ - time       │
                    └──────────────┘
```

## Teachers

Teachers are the most constrained resource. A teacher:
- Can only be in one place at a time
- Has limited availability (part-time, after-school duties)
- Has preferences (morning person, avoids Fridays)
- Has maximum teaching loads

```typescript
// src/services/teacher-service.ts
import { query, queryOne, execute } from '../db/client.js';
import type { Teacher, TeacherAvailability } from '../types/index.js';

export class TeacherService {
  async createTeacher(data: {
    name: string;
    email?: string;
    department: string;
    maxPeriodsPerDay?: number;
    maxPeriodsPerWeek?: number;
  }): Promise<Teacher> {
    const teacher = await queryOne<Teacher>(
      `INSERT INTO teachers (name, email, department, max_periods_per_day, max_periods_per_week)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.name,
        data.email ?? null,
        data.department,
        data.maxPeriodsPerDay ?? 6,
        data.maxPeriodsPerWeek ?? 25,
      ]
    );

    if (!teacher) throw new Error('Failed to create teacher');
    return teacher;
  }

  async getTeacher(id: string): Promise<Teacher | null> {
    return queryOne<Teacher>(
      'SELECT * FROM teachers WHERE id = $1',
      [id]
    );
  }

  async getAllTeachers(): Promise<Teacher[]> {
    return query<Teacher>(
      'SELECT * FROM teachers ORDER BY department, name'
    );
  }

  async getTeachersByDepartment(department: string): Promise<Teacher[]> {
    return query<Teacher>(
      'SELECT * FROM teachers WHERE department = $1 ORDER BY name',
      [department]
    );
  }

  async setAvailability(
    teacherId: string,
    availability: Array<{
      dayOfWeek: number;
      periodId: string;
      isAvailable: boolean;
      preference: number;
    }>
  ): Promise<void> {
    // Delete existing availability
    await execute(
      'DELETE FROM teacher_availability WHERE teacher_id = $1',
      [teacherId]
    );

    // Insert new availability
    for (const slot of availability) {
      await execute(
        `INSERT INTO teacher_availability (teacher_id, day_of_week, period_id, is_available, preference)
         VALUES ($1, $2, $3, $4, $5)`,
        [teacherId, slot.dayOfWeek, slot.periodId, slot.isAvailable, slot.preference]
      );
    }
  }

  async getAvailability(teacherId: string): Promise<TeacherAvailability[]> {
    return query<TeacherAvailability>(
      `SELECT * FROM teacher_availability
       WHERE teacher_id = $1
       ORDER BY day_of_week, period_id`,
      [teacherId]
    );
  }

  async getTeachersWithLoad(scheduleId: string): Promise<Array<Teacher & {
    assignedPeriods: number;
  }>> {
    return query(
      `SELECT t.*, COUNT(a.id)::int as assigned_periods
       FROM teachers t
       LEFT JOIN sections s ON s.teacher_id = t.id
       LEFT JOIN assignments a ON a.section_id = s.id AND a.schedule_id = $1
       GROUP BY t.id
       ORDER BY t.department, t.name`,
      [scheduleId]
    );
  }
}

export const teacherService = new TeacherService();
```

## Classes and Sections

A **class** is a course definition (Algebra I, World History). A **section** is a specific instance of that class with an assigned teacher.

Why separate them?
- Multiple teachers may teach the same class
- Each section might have different student counts
- Constraints can apply to classes (all Algebra sections need labs) or sections (this specific section needs room 101)

```typescript
// src/services/class-service.ts
import { query, queryOne, execute } from '../db/client.js';
import type { Class, Section } from '../types/index.js';

export class ClassService {
  async createClass(data: {
    name: string;
    code: string;
    department: string;
    periodsPerWeek: number;
    requiresLab: boolean;
    maxStudents: number;
  }): Promise<Class> {
    const cls = await queryOne<Class>(
      `INSERT INTO classes (name, code, department, periods_per_week, requires_lab, max_students)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.name, data.code, data.department, data.periodsPerWeek, data.requiresLab, data.maxStudents]
    );

    if (!cls) throw new Error('Failed to create class');
    return cls;
  }

  async getAllClasses(): Promise<Class[]> {
    return query<Class>(
      'SELECT * FROM classes ORDER BY department, code'
    );
  }

  async getClassesByDepartment(department: string): Promise<Class[]> {
    return query<Class>(
      'SELECT * FROM classes WHERE department = $1 ORDER BY code',
      [department]
    );
  }

  async createSection(data: {
    classId: string;
    teacherId: string;
    sectionNumber?: number;
    maxStudents?: number;
  }): Promise<Section> {
    // Get next section number if not provided
    let sectionNumber = data.sectionNumber;
    if (!sectionNumber) {
      const result = await queryOne<{ max: number }>(
        `SELECT COALESCE(MAX(section_number), 0) as max
         FROM sections WHERE class_id = $1`,
        [data.classId]
      );
      sectionNumber = (result?.max ?? 0) + 1;
    }

    const section = await queryOne<Section>(
      `INSERT INTO sections (class_id, teacher_id, section_number, max_students)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.classId, data.teacherId, sectionNumber, data.maxStudents ?? null]
    );

    if (!section) throw new Error('Failed to create section');
    return section;
  }

  async getAllSections(): Promise<Array<Section & {
    className: string;
    classCode: string;
    teacherName: string;
    periodsPerWeek: number;
    requiresLab: boolean;
  }>> {
    return query(
      `SELECT s.*, c.name as class_name, c.code as class_code,
              t.name as teacher_name, c.periods_per_week, c.requires_lab
       FROM sections s
       JOIN classes c ON c.id = s.class_id
       JOIN teachers t ON t.id = s.teacher_id
       ORDER BY c.department, c.code, s.section_number`
    );
  }

  async getSectionsByTeacher(teacherId: string): Promise<Section[]> {
    return query<Section>(
      `SELECT s.*, c.name as class_name, c.code as class_code
       FROM sections s
       JOIN classes c ON c.id = s.class_id
       WHERE s.teacher_id = $1
       ORDER BY c.code, s.section_number`,
      [teacherId]
    );
  }
}

export const classService = new ClassService();
```

## Rooms

Rooms have capacity and equipment constraints. A chemistry class needs a lab. A lecture needs enough seats.

```typescript
// src/services/room-service.ts
import { query, queryOne, execute } from '../db/client.js';
import type { Room } from '../types/index.js';

export class RoomService {
  async createRoom(data: {
    name: string;
    building?: string;
    capacity: number;
    isLab: boolean;
    equipment: string[];
  }): Promise<Room> {
    const room = await queryOne<Room>(
      `INSERT INTO rooms (name, building, capacity, is_lab, equipment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.building ?? null, data.capacity, data.isLab, data.equipment]
    );

    if (!room) throw new Error('Failed to create room');
    return room;
  }

  async getAllRooms(): Promise<Room[]> {
    return query<Room>(
      'SELECT * FROM rooms ORDER BY building, name'
    );
  }

  async getLabRooms(): Promise<Room[]> {
    return query<Room>(
      'SELECT * FROM rooms WHERE is_lab = true ORDER BY building, name'
    );
  }

  async getRoomsByCapacity(minCapacity: number): Promise<Room[]> {
    return query<Room>(
      'SELECT * FROM rooms WHERE capacity >= $1 ORDER BY capacity',
      [minCapacity]
    );
  }

  async getRoomsWithUtilization(scheduleId: string): Promise<Array<Room & {
    usedSlots: number;
    totalSlots: number;
    utilization: number;
  }>> {
    return query(
      `WITH slot_count AS (
         SELECT COUNT(*)::int as total FROM time_slots WHERE NOT is_break
       )
       SELECT r.*,
              COUNT(a.id)::int as used_slots,
              (SELECT total FROM slot_count) as total_slots,
              ROUND(COUNT(a.id)::numeric / (SELECT total FROM slot_count) * 100, 1) as utilization
       FROM rooms r
       LEFT JOIN assignments a ON a.room_id = r.id AND a.schedule_id = $1
       GROUP BY r.id
       ORDER BY r.building, r.name`,
      [scheduleId]
    );
  }
}

export const roomService = new RoomService();
```

## Time Slots

Time slots define when classes can be scheduled. Most schools use:
- 5 days per week (Monday-Friday)
- 6-8 periods per day
- Some periods are breaks (lunch, passing time)

```typescript
// src/services/timeslot-service.ts
import { query, queryOne, execute } from '../db/client.js';
import type { TimeSlot } from '../types/index.js';

export class TimeSlotService {
  async createTimeSlot(data: {
    dayOfWeek: number;
    periodNumber: number;
    startTime: string;
    endTime: string;
    isBreak: boolean;
  }): Promise<TimeSlot> {
    const slot = await queryOne<TimeSlot>(
      `INSERT INTO time_slots (day_of_week, period_number, start_time, end_time, is_break)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.dayOfWeek, data.periodNumber, data.startTime, data.endTime, data.isBreak]
    );

    if (!slot) throw new Error('Failed to create time slot');
    return slot;
  }

  async getAllTimeSlots(): Promise<TimeSlot[]> {
    return query<TimeSlot>(
      'SELECT * FROM time_slots ORDER BY day_of_week, period_number'
    );
  }

  async getSchedulableSlots(): Promise<TimeSlot[]> {
    return query<TimeSlot>(
      'SELECT * FROM time_slots WHERE NOT is_break ORDER BY day_of_week, period_number'
    );
  }

  async getSlotsByDay(dayOfWeek: number): Promise<TimeSlot[]> {
    return query<TimeSlot>(
      'SELECT * FROM time_slots WHERE day_of_week = $1 ORDER BY period_number',
      [dayOfWeek]
    );
  }

  /**
   * Generate standard school time slots
   */
  async generateStandardSlots(config: {
    startTime: string;      // "08:00"
    periodMinutes: number;  // 50
    passingMinutes: number; // 5
    periodsBeforeLunch: number; // 4
    lunchMinutes: number;   // 45
    totalPeriods: number;   // 8
    daysPerWeek: number;    // 5 (Mon-Fri)
  }): Promise<void> {
    // Clear existing slots
    await execute('DELETE FROM time_slots');

    const parseTime = (time: string): { hours: number; minutes: number } => {
      const [hours, minutes] = time.split(':').map(Number);
      return { hours: hours!, minutes: minutes! };
    };

    const formatTime = (hours: number, minutes: number): string => {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const addMinutes = (time: { hours: number; minutes: number }, mins: number) => {
      let totalMinutes = time.hours * 60 + time.minutes + mins;
      return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
      };
    };

    for (let day = 1; day <= config.daysPerWeek; day++) {
      let currentTime = parseTime(config.startTime);

      for (let period = 1; period <= config.totalPeriods; period++) {
        const startTime = formatTime(currentTime.hours, currentTime.minutes);
        currentTime = addMinutes(currentTime, config.periodMinutes);
        const endTime = formatTime(currentTime.hours, currentTime.minutes);

        await this.createTimeSlot({
          dayOfWeek: day,
          periodNumber: period,
          startTime,
          endTime,
          isBreak: false,
        });

        // Add passing time
        currentTime = addMinutes(currentTime, config.passingMinutes);

        // Add lunch after specified period
        if (period === config.periodsBeforeLunch) {
          const lunchStart = formatTime(currentTime.hours, currentTime.minutes);
          currentTime = addMinutes(currentTime, config.lunchMinutes);
          const lunchEnd = formatTime(currentTime.hours, currentTime.minutes);

          await this.createTimeSlot({
            dayOfWeek: day,
            periodNumber: 0, // Special period number for lunch
            startTime: lunchStart,
            endTime: lunchEnd,
            isBreak: true,
          });

          // More passing time after lunch
          currentTime = addMinutes(currentTime, config.passingMinutes);
        }
      }
    }
  }
}

export const timeSlotService = new TimeSlotService();
```

## Constraints

Constraints are the rules that make scheduling hard. They fall into two categories:

**Hard constraints** - Must be satisfied or the schedule is invalid
- No teacher in two places at once
- No room double-booked
- Teacher must be available
- Section needs enough room capacity

**Soft constraints** - Should be satisfied but can be violated (with penalty)
- Teacher preferences (avoid 8 AM)
- Minimize consecutive periods
- Keep same class in same room
- Balance teacher loads

```typescript
// src/services/constraint-service.ts
import { query, queryOne, execute } from '../db/client.js';
import type { Constraint, ConstraintType } from '../types/index.js';

export class ConstraintService {
  async createConstraint(data: {
    type: ConstraintType;
    priority: 'hard' | 'soft';
    weight?: number;
    parameters: Record<string, unknown>;
  }): Promise<Constraint> {
    const constraint = await queryOne<Constraint>(
      `INSERT INTO constraints (type, priority, weight, parameters)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.type, data.priority, data.weight ?? 1, JSON.stringify(data.parameters)]
    );

    if (!constraint) throw new Error('Failed to create constraint');
    return constraint;
  }

  async getAllConstraints(): Promise<Constraint[]> {
    return query<Constraint>(
      'SELECT * FROM constraints ORDER BY priority DESC, weight DESC'
    );
  }

  async getHardConstraints(): Promise<Constraint[]> {
    return query<Constraint>(
      "SELECT * FROM constraints WHERE priority = 'hard'"
    );
  }

  async getSoftConstraints(): Promise<Constraint[]> {
    return query<Constraint>(
      "SELECT * FROM constraints WHERE priority = 'soft' ORDER BY weight DESC"
    );
  }

  async deleteConstraint(id: string): Promise<void> {
    await execute('DELETE FROM constraints WHERE id = $1', [id]);
  }

  /**
   * Create common default constraints
   */
  async createDefaultConstraints(): Promise<void> {
    // Hard constraints
    await this.createConstraint({
      type: 'teacher_unavailable',
      priority: 'hard',
      parameters: { description: 'Teachers cannot teach when marked unavailable' },
    });

    await this.createConstraint({
      type: 'room_required',
      priority: 'hard',
      parameters: { description: 'Lab classes must be in lab rooms' },
    });

    // Soft constraints
    await this.createConstraint({
      type: 'teacher_max_consecutive',
      priority: 'soft',
      weight: 10,
      parameters: { maxConsecutive: 3, description: 'Avoid more than 3 consecutive periods' },
    });

    await this.createConstraint({
      type: 'period_preference',
      priority: 'soft',
      weight: 5,
      parameters: { description: 'Honor teacher period preferences' },
    });
  }
}

export const constraintService = new ConstraintService();
```

## Validation

Before solving, validate the input data:

```typescript
// src/services/validation-service.ts

export interface ValidationError {
  type: 'error' | 'warning';
  entity: string;
  entityId: string;
  message: string;
}

export class ValidationService {
  async validateScheduleInput(scheduleId: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check: Every section has a teacher
    const orphanSections = await query<{ id: string; class_name: string }>(
      `SELECT s.id, c.name as class_name
       FROM sections s
       JOIN classes c ON c.id = s.class_id
       WHERE s.teacher_id IS NULL`
    );

    for (const section of orphanSections) {
      errors.push({
        type: 'error',
        entity: 'section',
        entityId: section.id,
        message: `Section of ${section.class_name} has no assigned teacher`,
      });
    }

    // Check: Enough time slots for all sections
    const totalPeriodsNeeded = await queryOne<{ total: number }>(
      `SELECT SUM(c.periods_per_week)::int as total
       FROM sections s
       JOIN classes c ON c.id = s.class_id`
    );

    const availableSlots = await queryOne<{ total: number }>(
      `SELECT COUNT(*)::int as total FROM time_slots WHERE NOT is_break`
    );

    const totalRoomSlots = await queryOne<{ total: number }>(
      `SELECT COUNT(r.id)::int * COUNT(t.id)::int as total
       FROM rooms r, time_slots t
       WHERE NOT t.is_break`
    );

    if ((totalPeriodsNeeded?.total ?? 0) > (totalRoomSlots?.total ?? 0)) {
      errors.push({
        type: 'error',
        entity: 'schedule',
        entityId: scheduleId,
        message: `Need ${totalPeriodsNeeded?.total} period-slots but only have ${totalRoomSlots?.total} room-slots available`,
      });
    }

    // Check: Lab classes have lab rooms
    const labClassCount = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT s.id)::int as count
       FROM sections s
       JOIN classes c ON c.id = s.class_id
       WHERE c.requires_lab = true`
    );

    const labRoomSlots = await queryOne<{ total: number }>(
      `SELECT COUNT(r.id)::int * COUNT(t.id)::int as total
       FROM rooms r, time_slots t
       WHERE r.is_lab = true AND NOT t.is_break`
    );

    const labPeriodsNeeded = await queryOne<{ total: number }>(
      `SELECT SUM(c.periods_per_week)::int as total
       FROM sections s
       JOIN classes c ON c.id = s.class_id
       WHERE c.requires_lab = true`
    );

    if ((labPeriodsNeeded?.total ?? 0) > (labRoomSlots?.total ?? 0)) {
      errors.push({
        type: 'error',
        entity: 'schedule',
        entityId: scheduleId,
        message: `Need ${labPeriodsNeeded?.total} lab period-slots but only have ${labRoomSlots?.total} available`,
      });
    }

    // Warning: Teacher overload
    const overloadedTeachers = await query<{ id: string; name: string; periods: number; max: number }>(
      `SELECT t.id, t.name, SUM(c.periods_per_week)::int as periods, t.max_periods_per_week as max
       FROM teachers t
       JOIN sections s ON s.teacher_id = t.id
       JOIN classes c ON c.id = s.class_id
       GROUP BY t.id
       HAVING SUM(c.periods_per_week) > t.max_periods_per_week`
    );

    for (const teacher of overloadedTeachers) {
      errors.push({
        type: 'warning',
        entity: 'teacher',
        entityId: teacher.id,
        message: `${teacher.name} assigned ${teacher.periods} periods but max is ${teacher.max}`,
      });
    }

    return errors;
  }
}

export const validationService = new ValidationService();
```

## Next Steps

With the data model defined, the next chapter explains the fundamentals of Integer Linear Programming—how to express scheduling as an optimization problem.
