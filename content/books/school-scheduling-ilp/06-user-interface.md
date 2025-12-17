# Building the Schedule UI

## The Schedule Grid

The primary view is a grid showing assignments by teacher, room, or time:

```
        Monday      Tuesday     Wednesday   Thursday    Friday
       ──────────────────────────────────────────────────────────
8:00   │ Alg I    │ Alg II   │ Alg I     │           │ Alg II  │
       │ Rm 101   │ Rm 101   │ Rm 101    │           │ Rm 101  │
       ──────────────────────────────────────────────────────────
9:00   │ Geom     │ Alg I    │ Geom      │ Alg I     │ Geom    │
       │ Rm 102   │ Rm 101   │ Rm 102    │ Rm 101    │ Rm 102  │
       ──────────────────────────────────────────────────────────
```

## Schedule Grid Component

```typescript
// web/src/components/ScheduleGrid.ts

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
}

interface Assignment {
  id: string;
  sectionId: string;
  roomId: string;
  timeSlotId: string;
  className: string;
  classCode: string;
  teacherName: string;
  roomName: string;
  sectionNumber: number;
}

interface GridCell {
  slot: TimeSlot;
  assignment: Assignment | null;
  conflict: boolean;
}

export class ScheduleGrid {
  private container: HTMLElement;
  private scheduleId: string;
  private viewMode: 'teacher' | 'room' | 'overview';
  private selectedEntity: string | null = null;

  private timeSlots: TimeSlot[] = [];
  private assignments: Assignment[] = [];
  private days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  constructor(containerId: string, scheduleId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container not found');
    this.container = container;
    this.scheduleId = scheduleId;
    this.viewMode = 'overview';

    this.load();
  }

  private async load(): Promise<void> {
    this.container.innerHTML = '<div class="loading">Loading schedule...</div>';

    try {
      const [slotsRes, assignmentsRes] = await Promise.all([
        fetch('/api/timeslots'),
        fetch(`/api/schedules/${this.scheduleId}/assignments`),
      ]);

      this.timeSlots = await slotsRes.json();
      this.assignments = await assignmentsRes.json();

      this.render();
    } catch (error) {
      this.container.innerHTML = '<div class="error">Failed to load schedule</div>';
    }
  }

  private render(): void {
    // Get unique periods (sorted)
    const periods = [...new Set(this.timeSlots.map((s) => s.periodNumber))].sort(
      (a, b) => a - b
    );

    // Build grid data
    const grid: GridCell[][] = [];

    for (const periodNum of periods) {
      const row: GridCell[] = [];

      for (let day = 1; day <= 5; day++) {
        const slot = this.timeSlots.find(
          (s) => s.dayOfWeek === day && s.periodNumber === periodNum
        );

        if (!slot) {
          row.push({ slot: null as never, assignment: null, conflict: false });
          continue;
        }

        const assignment = this.getAssignment(slot.id);
        const conflict = this.hasConflict(slot.id);

        row.push({ slot, assignment, conflict });
      }

      grid.push(row);
    }

    this.container.innerHTML = `
      <div class="schedule-grid-container">
        <div class="grid-controls">
          <select class="view-mode-select">
            <option value="overview" ${this.viewMode === 'overview' ? 'selected' : ''}>
              Overview
            </option>
            <option value="teacher" ${this.viewMode === 'teacher' ? 'selected' : ''}>
              By Teacher
            </option>
            <option value="room" ${this.viewMode === 'room' ? 'selected' : ''}>
              By Room
            </option>
          </select>
          ${this.viewMode !== 'overview' ? this.renderEntitySelector() : ''}
        </div>

        <table class="schedule-grid">
          <thead>
            <tr>
              <th>Time</th>
              ${this.days.map((d) => `<th>${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${grid.map((row, i) => this.renderRow(row, periods[i]!)).join('')}
          </tbody>
        </table>

        <div class="grid-legend">
          <span class="legend-item">
            <span class="legend-color conflict"></span> Conflict
          </span>
          <span class="legend-item">
            <span class="legend-color manual"></span> Manual Override
          </span>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private renderEntitySelector(): string {
    const entities =
      this.viewMode === 'teacher'
        ? this.getUniqueTeachers()
        : this.getUniqueRooms();

    return `
      <select class="entity-select">
        <option value="">Select ${this.viewMode}...</option>
        ${entities.map((e) => `<option value="${e.id}">${e.name}</option>`).join('')}
      </select>
    `;
  }

  private renderRow(row: GridCell[], periodNum: number): string {
    const firstSlot = row.find((c) => c.slot)?.slot;
    const timeLabel = firstSlot
      ? `${firstSlot.startTime}-${firstSlot.endTime}`
      : `Period ${periodNum}`;

    return `
      <tr>
        <td class="time-cell">${timeLabel}</td>
        ${row.map((cell) => this.renderCell(cell)).join('')}
      </tr>
    `;
  }

  private renderCell(cell: GridCell): string {
    if (!cell.slot) {
      return '<td class="empty-cell"></td>';
    }

    if (!cell.assignment) {
      return `
        <td class="grid-cell empty"
            data-slot-id="${cell.slot.id}"
            draggable="false">
        </td>
      `;
    }

    const classes = ['grid-cell', 'assigned'];
    if (cell.conflict) classes.push('conflict');

    return `
      <td class="${classes.join(' ')}"
          data-slot-id="${cell.slot.id}"
          data-assignment-id="${cell.assignment.id}"
          draggable="true">
        <div class="cell-content">
          <div class="class-name">${cell.assignment.classCode}</div>
          <div class="room-name">${cell.assignment.roomName}</div>
          ${this.viewMode === 'overview' ? `<div class="teacher-name">${cell.assignment.teacherName}</div>` : ''}
        </div>
      </td>
    `;
  }

  private getAssignment(slotId: string): Assignment | null {
    let filtered = this.assignments.filter((a) => a.timeSlotId === slotId);

    if (this.viewMode === 'teacher' && this.selectedEntity) {
      filtered = filtered.filter(
        (a) => a.teacherName === this.selectedEntity // Simplified; use ID in real code
      );
    }

    if (this.viewMode === 'room' && this.selectedEntity) {
      filtered = filtered.filter((a) => a.roomId === this.selectedEntity);
    }

    return filtered[0] ?? null;
  }

  private hasConflict(slotId: string): boolean {
    const slotAssignments = this.assignments.filter(
      (a) => a.timeSlotId === slotId
    );

    // Check for room conflicts
    const rooms = slotAssignments.map((a) => a.roomId);
    if (new Set(rooms).size !== rooms.length) return true;

    // Check for teacher conflicts (would need teacher ID on assignment)
    // Simplified here

    return false;
  }

  private getUniqueTeachers(): Array<{ id: string; name: string }> {
    const seen = new Set<string>();
    const teachers: Array<{ id: string; name: string }> = [];

    for (const a of this.assignments) {
      if (!seen.has(a.teacherName)) {
        seen.add(a.teacherName);
        teachers.push({ id: a.teacherName, name: a.teacherName });
      }
    }

    return teachers.sort((a, b) => a.name.localeCompare(b.name));
  }

  private getUniqueRooms(): Array<{ id: string; name: string }> {
    const seen = new Set<string>();
    const rooms: Array<{ id: string; name: string }> = [];

    for (const a of this.assignments) {
      if (!seen.has(a.roomId)) {
        seen.add(a.roomId);
        rooms.push({ id: a.roomId, name: a.roomName });
      }
    }

    return rooms.sort((a, b) => a.name.localeCompare(b.name));
  }

  private setupEventListeners(): void {
    // View mode change
    const viewSelect = this.container.querySelector('.view-mode-select');
    viewSelect?.addEventListener('change', (e) => {
      this.viewMode = (e.target as HTMLSelectElement).value as typeof this.viewMode;
      this.selectedEntity = null;
      this.render();
    });

    // Entity selection
    const entitySelect = this.container.querySelector('.entity-select');
    entitySelect?.addEventListener('change', (e) => {
      this.selectedEntity = (e.target as HTMLSelectElement).value || null;
      this.render();
    });

    // Cell click
    this.container.querySelectorAll('.grid-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        const assignmentId = cell.getAttribute('data-assignment-id');
        const slotId = cell.getAttribute('data-slot-id');
        if (assignmentId) {
          this.showAssignmentDetails(assignmentId);
        } else if (slotId) {
          this.showAddAssignmentDialog(slotId);
        }
      });
    });

    // Drag and drop for manual adjustments
    this.setupDragDrop();
  }

  private setupDragDrop(): void {
    const cells = this.container.querySelectorAll('.grid-cell[draggable="true"]');

    cells.forEach((cell) => {
      cell.addEventListener('dragstart', (e) => {
        const event = e as DragEvent;
        const assignmentId = (event.target as HTMLElement).getAttribute(
          'data-assignment-id'
        );
        event.dataTransfer?.setData('text/plain', assignmentId ?? '');
      });
    });

    const allCells = this.container.querySelectorAll('.grid-cell');

    allCells.forEach((cell) => {
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.classList.add('drag-over');
      });

      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drag-over');
      });

      cell.addEventListener('drop', async (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');

        const event = e as DragEvent;
        const assignmentId = event.dataTransfer?.getData('text/plain');
        const newSlotId = (event.target as HTMLElement)
          .closest('.grid-cell')
          ?.getAttribute('data-slot-id');

        if (assignmentId && newSlotId) {
          await this.moveAssignment(assignmentId, newSlotId);
        }
      });
    });
  }

  private async moveAssignment(
    assignmentId: string,
    newSlotId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `/api/schedules/${this.scheduleId}/assignments/${assignmentId}/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeSlotId: newSlotId }),
        }
      );

      if (response.ok) {
        await this.load(); // Reload the grid
      } else {
        const error = await response.json();
        alert(`Cannot move: ${error.message}`);
      }
    } catch (error) {
      alert('Failed to move assignment');
    }
  }

  private showAssignmentDetails(assignmentId: string): void {
    const assignment = this.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Show modal with details and edit/delete options
    // Implementation depends on your UI framework
    console.log('Show details for:', assignment);
  }

  private showAddAssignmentDialog(slotId: string): void {
    // Show dialog to manually add an assignment
    // Implementation depends on your UI framework
    console.log('Add assignment at slot:', slotId);
  }
}
```

## Schedule Grid Styles

```css
/* styles/schedule-grid.css */

.schedule-grid-container {
  padding: var(--space-4);
}

.grid-controls {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.grid-controls select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.875rem;
}

.schedule-grid {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.schedule-grid th,
.schedule-grid td {
  border: 1px solid var(--color-border);
  padding: var(--space-2);
  text-align: center;
  vertical-align: top;
}

.schedule-grid th {
  background: var(--color-bg-secondary);
  font-weight: 600;
  padding: var(--space-3);
}

.time-cell {
  background: var(--color-bg-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
  width: 80px;
}

.grid-cell {
  min-height: 80px;
  cursor: pointer;
  transition: background 0.15s;
}

.grid-cell:hover {
  background: var(--color-bg-secondary);
}

.grid-cell.empty {
  background: transparent;
}

.grid-cell.assigned {
  background: #e3f2fd;
}

.grid-cell.conflict {
  background: #ffebee;
  border-color: #ef5350;
}

.grid-cell.manual {
  background: #fff3e0;
}

.grid-cell.drag-over {
  background: #c8e6c9;
  outline: 2px dashed #4caf50;
}

.cell-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.75rem;
}

.class-name {
  font-weight: 600;
  color: #1565c0;
}

.room-name {
  color: var(--color-text-secondary);
}

.teacher-name {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}

.grid-legend {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
  font-size: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid var(--color-border);
}

.legend-color.conflict {
  background: #ffebee;
  border-color: #ef5350;
}

.legend-color.manual {
  background: #fff3e0;
  border-color: #ff9800;
}
```

## Conflict Detection

Highlight conflicts in real-time:

```typescript
// src/services/conflict-detector.ts

export interface Conflict {
  type: 'teacher' | 'room';
  entityId: string;
  entityName: string;
  timeSlotId: string;
  assignments: string[]; // assignment IDs
}

export function detectConflicts(
  assignments: Array<{
    id: string;
    teacherId: string;
    roomId: string;
    timeSlotId: string;
  }>
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Group by time slot
  const bySlot = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = bySlot.get(a.timeSlotId) ?? [];
    list.push(a);
    bySlot.set(a.timeSlotId, list);
  }

  for (const [slotId, slotAssignments] of bySlot) {
    // Check teacher conflicts
    const teacherCounts = new Map<string, string[]>();
    for (const a of slotAssignments) {
      const list = teacherCounts.get(a.teacherId) ?? [];
      list.push(a.id);
      teacherCounts.set(a.teacherId, list);
    }

    for (const [teacherId, assignmentIds] of teacherCounts) {
      if (assignmentIds.length > 1) {
        conflicts.push({
          type: 'teacher',
          entityId: teacherId,
          entityName: teacherId, // Lookup name in real code
          timeSlotId: slotId,
          assignments: assignmentIds,
        });
      }
    }

    // Check room conflicts
    const roomCounts = new Map<string, string[]>();
    for (const a of slotAssignments) {
      const list = roomCounts.get(a.roomId) ?? [];
      list.push(a.id);
      roomCounts.set(a.roomId, list);
    }

    for (const [roomId, assignmentIds] of roomCounts) {
      if (assignmentIds.length > 1) {
        conflicts.push({
          type: 'room',
          entityId: roomId,
          entityName: roomId, // Lookup name in real code
          timeSlotId: slotId,
          assignments: assignmentIds,
        });
      }
    }
  }

  return conflicts;
}
```

## Manual Override API

Allow manual adjustments:

```typescript
// src/api/routes/schedules.ts (continued)

// Move assignment to different slot
schedulesRouter.post(
  '/:scheduleId/assignments/:assignmentId/move',
  async (req, res, next) => {
    try {
      const { scheduleId, assignmentId } = req.params;
      const { timeSlotId, roomId } = req.body;

      // Validate no conflicts
      const conflicts = await checkMoveConflicts(
        scheduleId,
        assignmentId,
        timeSlotId,
        roomId
      );

      if (conflicts.length > 0) {
        res.status(422).json({
          error: 'Move would create conflicts',
          conflicts,
        });
        return;
      }

      // Update assignment
      await execute(
        `UPDATE assignments
         SET time_slot_id = COALESCE($1, time_slot_id),
             room_id = COALESCE($2, room_id),
             is_manual_override = true
         WHERE id = $3 AND schedule_id = $4`,
        [timeSlotId, roomId, assignmentId, scheduleId]
      );

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

async function checkMoveConflicts(
  scheduleId: string,
  assignmentId: string,
  newSlotId?: string,
  newRoomId?: string
): Promise<Conflict[]> {
  // Get the assignment being moved
  const assignment = await queryOne<{
    sectionId: string;
    teacherId: string;
    roomId: string;
    timeSlotId: string;
  }>(
    `SELECT a.section_id as "sectionId",
            s.teacher_id as "teacherId",
            a.room_id as "roomId",
            a.time_slot_id as "timeSlotId"
     FROM assignments a
     JOIN sections s ON s.id = a.section_id
     WHERE a.id = $1`,
    [assignmentId]
  );

  if (!assignment) return [];

  const targetSlot = newSlotId ?? assignment.timeSlotId;
  const targetRoom = newRoomId ?? assignment.roomId;

  const conflicts: Conflict[] = [];

  // Check teacher conflict
  const teacherConflict = await queryOne<{ id: string }>(
    `SELECT a.id
     FROM assignments a
     JOIN sections s ON s.id = a.section_id
     WHERE a.schedule_id = $1
       AND a.time_slot_id = $2
       AND s.teacher_id = $3
       AND a.id != $4`,
    [scheduleId, targetSlot, assignment.teacherId, assignmentId]
  );

  if (teacherConflict) {
    conflicts.push({
      type: 'teacher',
      entityId: assignment.teacherId,
      entityName: 'Teacher',
      timeSlotId: targetSlot,
      assignments: [assignmentId, teacherConflict.id],
    });
  }

  // Check room conflict
  const roomConflict = await queryOne<{ id: string }>(
    `SELECT a.id
     FROM assignments a
     WHERE a.schedule_id = $1
       AND a.time_slot_id = $2
       AND a.room_id = $3
       AND a.id != $4`,
    [scheduleId, targetSlot, targetRoom, assignmentId]
  );

  if (roomConflict) {
    conflicts.push({
      type: 'room',
      entityId: targetRoom,
      entityName: 'Room',
      timeSlotId: targetSlot,
      assignments: [assignmentId, roomConflict.id],
    });
  }

  return conflicts;
}
```

## Calendar Export

Export to iCal format:

```typescript
// src/services/export-service.ts

export function generateICal(
  schedule: {
    name: string;
    semester: string;
  },
  assignments: Array<{
    className: string;
    roomName: string;
    teacherName: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
  startDate: Date,
  endDate: Date
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//School Scheduler//EN',
    `X-WR-CALNAME:${schedule.name}`,
  ];

  // Generate events for each assignment
  let uid = 1;

  for (const assignment of assignments) {
    // Find all dates matching the day of week
    const dates = getMatchingDates(
      assignment.dayOfWeek,
      startDate,
      endDate
    );

    for (const date of dates) {
      const startDateTime = combineDateAndTime(date, assignment.startTime);
      const endDateTime = combineDateAndTime(date, assignment.endTime);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid++}@school-scheduler`);
      lines.push(`DTSTART:${formatICalDate(startDateTime)}`);
      lines.push(`DTEND:${formatICalDate(endDateTime)}`);
      lines.push(`SUMMARY:${assignment.className}`);
      lines.push(`LOCATION:${assignment.roomName}`);
      lines.push(`DESCRIPTION:Teacher: ${assignment.teacherName}`);
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function getMatchingDates(
  dayOfWeek: number,
  start: Date,
  end: Date
): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  // Adjust to first occurrence of dayOfWeek
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours!, minutes!, 0, 0);
  return result;
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
```

## Next Steps

The final chapter covers advanced optimization techniques for larger schools and real-world deployment considerations.
