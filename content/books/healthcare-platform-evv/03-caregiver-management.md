# Caregiver Management and Matching

Caregivers are the frontline of home healthcare. A great care plan means nothing without the right person to execute it. This chapter covers managing caregiver profiles, credentials, availability, and using AI to match caregivers with patients.

## Caregiver Profiles

Caregivers have complex profiles:

```typescript
// verticals/scheduling-visits/src/types/caregiver.ts
export interface Caregiver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hireDate: Date;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';

  // Location for matching
  latitude?: number;
  longitude?: number;
  maxTravelDistance: number; // miles

  // Qualifications
  certifications: Certification[];
  skills: string[];
  languages: string[];

  // Preferences and constraints
  preferredShiftTypes: ShiftType[];
  maxHoursPerWeek: number;

  // Performance
  averageRating?: number;
  totalVisits: number;

  hourlyRate: number;
}

export interface Certification {
  type: CertificationType;
  issuedDate: Date;
  expirationDate: Date;
  verificationStatus: 'pending' | 'verified' | 'expired';
}

export type CertificationType =
  | 'CNA'           // Certified Nursing Assistant
  | 'HHA'           // Home Health Aide
  | 'LPN'           // Licensed Practical Nurse
  | 'RN'            // Registered Nurse
  | 'CPR'           // CPR Certification
  | 'FIRST_AID'
  | 'MED_ADMIN'     // Medication Administration
  | 'DEMENTIA_CARE'
  | 'HOSPICE';

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'overnight' | 'live_in';
```

## Caregiver Service

```typescript
// verticals/scheduling-visits/src/services/caregiver-service.ts
import { db } from '@folkcare/core';

export class CaregiverService {
  async createCaregiver(input: CreateCaregiverInput): Promise<Caregiver> {
    const result = await db.query(
      `INSERT INTO caregivers
       (first_name, last_name, email, phone, hire_date,
        latitude, longitude, max_travel_distance,
        certifications, skills, languages,
        preferred_shift_types, max_hours_per_week, hourly_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        input.hireDate,
        input.latitude,
        input.longitude,
        input.maxTravelDistance,
        JSON.stringify(input.certifications),
        input.skills,
        input.languages,
        input.preferredShiftTypes,
        input.maxHoursPerWeek,
        input.hourlyRate,
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async getCaregiverWithAvailability(
    id: string,
    startDate: Date,
    endDate: Date
  ): Promise<CaregiverWithAvailability> {
    const caregiver = await this.getCaregiver(id);
    if (!caregiver) throw new Error('Caregiver not found');

    const availability = await this.getAvailability(id, startDate, endDate);
    const scheduledVisits = await this.getScheduledVisits(id, startDate, endDate);

    return {
      ...caregiver,
      availability,
      scheduledVisits,
    };
  }

  async updateCertification(
    caregiverId: string,
    certification: Certification
  ): Promise<void> {
    const caregiver = await this.getCaregiver(caregiverId);
    if (!caregiver) throw new Error('Caregiver not found');

    const certifications = caregiver.certifications.filter(
      (c) => c.type !== certification.type
    );
    certifications.push(certification);

    await db.query(
      `UPDATE caregivers
       SET certifications = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(certifications), caregiverId]
    );
  }

  async checkCertificationCompliance(caregiverId: string): Promise<ComplianceResult> {
    const caregiver = await this.getCaregiver(caregiverId);
    if (!caregiver) throw new Error('Caregiver not found');

    const issues: ComplianceIssue[] = [];
    const today = new Date();

    for (const cert of caregiver.certifications) {
      const expirationDate = new Date(cert.expirationDate);
      const daysUntilExpiration = Math.floor(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration < 0) {
        issues.push({
          type: 'expired_certification',
          severity: 'critical',
          message: `${cert.type} certification expired ${Math.abs(daysUntilExpiration)} days ago`,
          certification: cert,
        });
      } else if (daysUntilExpiration < 30) {
        issues.push({
          type: 'expiring_certification',
          severity: 'warning',
          message: `${cert.type} certification expires in ${daysUntilExpiration} days`,
          certification: cert,
        });
      }
    }

    return {
      compliant: issues.filter((i) => i.severity === 'critical').length === 0,
      issues,
    };
  }
}
```

## Availability Management

Caregivers set their availability:

```typescript
// verticals/scheduling-visits/src/services/availability-service.ts
export interface AvailabilityBlock {
  id: string;
  caregiverId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  isRecurring: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;
}

export interface TimeOffRequest {
  id: string;
  caregiverId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
}

export class AvailabilityService {
  async setRecurringAvailability(
    caregiverId: string,
    blocks: Omit<AvailabilityBlock, 'id' | 'caregiverId'>[]
  ): Promise<void> {
    await db.query('BEGIN');

    try {
      // Clear existing recurring availability
      await db.query(
        `DELETE FROM availability_blocks
         WHERE caregiver_id = $1 AND is_recurring = true`,
        [caregiverId]
      );

      // Insert new blocks
      for (const block of blocks) {
        await db.query(
          `INSERT INTO availability_blocks
           (caregiver_id, day_of_week, start_time, end_time, is_recurring)
           VALUES ($1, $2, $3, $4, true)`,
          [caregiverId, block.dayOfWeek, block.startTime, block.endTime]
        );
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async requestTimeOff(
    caregiverId: string,
    startDate: Date,
    endDate: Date,
    reason: string
  ): Promise<TimeOffRequest> {
    // Check for conflicting scheduled visits
    const conflicts = await db.query(
      `SELECT COUNT(*) as count
       FROM visits
       WHERE caregiver_id = $1
         AND scheduled_start >= $2
         AND scheduled_start <= $3
         AND status NOT IN ('cancelled')`,
      [caregiverId, startDate, endDate]
    );

    const conflictCount = parseInt(conflicts.rows[0].count);

    const result = await db.query(
      `INSERT INTO time_off_requests
       (caregiver_id, start_date, end_date, reason, status, conflict_count)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [caregiverId, startDate, endDate, reason, conflictCount]
    );

    return result.rows[0];
  }

  async getAvailableSlots(
    caregiverId: string,
    date: Date
  ): Promise<TimeSlot[]> {
    const dayOfWeek = date.getDay();

    // Get recurring availability for this day
    const availabilityResult = await db.query(
      `SELECT * FROM availability_blocks
       WHERE caregiver_id = $1
         AND day_of_week = $2
         AND is_recurring = true`,
      [caregiverId, dayOfWeek]
    );

    // Get scheduled visits for this day
    const visitsResult = await db.query(
      `SELECT scheduled_start, scheduled_end
       FROM visits
       WHERE caregiver_id = $1
         AND DATE(scheduled_start) = $2
         AND status NOT IN ('cancelled')
       ORDER BY scheduled_start`,
      [caregiverId, date.toISOString().split('T')[0]]
    );

    // Calculate available slots by subtracting visits from availability
    const slots: TimeSlot[] = [];

    for (const block of availabilityResult.rows) {
      const availableStart = this.parseTime(date, block.start_time);
      const availableEnd = this.parseTime(date, block.end_time);

      // Subtract scheduled visits
      let currentStart = availableStart;

      for (const visit of visitsResult.rows) {
        const visitStart = new Date(visit.scheduled_start);
        const visitEnd = new Date(visit.scheduled_end);

        if (visitStart > currentStart) {
          slots.push({
            start: currentStart,
            end: visitStart,
          });
        }

        currentStart = visitEnd > currentStart ? visitEnd : currentStart;
      }

      if (currentStart < availableEnd) {
        slots.push({
          start: currentStart,
          end: availableEnd,
        });
      }
    }

    return slots;
  }

  private parseTime(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}
```

## AI-Powered Caregiver Matching

Matching the right caregiver to a patient is complex. AI helps:

```typescript
// verticals/scheduling-visits/src/services/caregiver-matching-service.ts
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@folkcare/core';

export interface MatchResult {
  caregiverId: string;
  score: number;
  reasons: string[];
  warnings: string[];
}

export class CaregiverMatchingService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async findBestMatches(
    clientId: string,
    visitDate: Date,
    visitDuration: number
  ): Promise<MatchResult[]> {
    // Get client information
    const client = await this.getClient(clientId);
    const carePlan = await this.getActiveCarePlan(clientId);

    // Get available caregivers
    const availableCaregivers = await this.getAvailableCaregivers(
      visitDate,
      visitDuration,
      client.latitude,
      client.longitude
    );

    if (availableCaregivers.length === 0) {
      return [];
    }

    // Get past visits for continuity scoring
    const pastVisits = await this.getPastVisits(clientId);

    // Use AI to rank caregivers
    const matches = await this.rankWithAI(
      client,
      carePlan,
      availableCaregivers,
      pastVisits
    );

    return matches;
  }

  private async getAvailableCaregivers(
    date: Date,
    duration: number,
    clientLat: number,
    clientLng: number
  ): Promise<Caregiver[]> {
    const dayOfWeek = date.getDay();
    const startTime = date.toTimeString().slice(0, 5);

    // Find caregivers who are:
    // 1. Available on this day/time
    // 2. Within travel distance
    // 3. Have required certifications (basic filter)
    const result = await db.query(
      `SELECT c.*,
              earth_distance(
                ll_to_earth(c.latitude, c.longitude),
                ll_to_earth($1, $2)
              ) / 1609.34 as distance_miles
       FROM caregivers c
       JOIN availability_blocks ab ON ab.caregiver_id = c.id
       WHERE c.status = 'active'
         AND ab.day_of_week = $3
         AND ab.start_time <= $4
         AND ab.end_time >= $5
         AND earth_distance(
               ll_to_earth(c.latitude, c.longitude),
               ll_to_earth($1, $2)
             ) / 1609.34 <= c.max_travel_distance
       ORDER BY distance_miles`,
      [
        clientLat,
        clientLng,
        dayOfWeek,
        startTime,
        this.addMinutes(startTime, duration),
      ]
    );

    return result.rows;
  }

  private async rankWithAI(
    client: Client,
    carePlan: CarePlan,
    caregivers: Caregiver[],
    pastVisits: Visit[]
  ): Promise<MatchResult[]> {
    // Build context for AI
    const caregiverSummaries = caregivers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      certifications: c.certifications.map((cert) => cert.type),
      skills: c.skills,
      languages: c.languages,
      rating: c.averageRating,
      distanceMiles: c.distance_miles,
      pastVisitsWithClient: pastVisits.filter((v) => v.caregiverId === c.id).length,
    }));

    const prompt = `You are a healthcare staffing coordinator. Match caregivers to this client.

Client Needs:
- Conditions: ${client.conditions.join(', ')}
- Languages: ${client.preferredLanguages.join(', ')}
- Care Plan Tasks: ${carePlan.taskTypes.join(', ')}
- Special Requirements: ${carePlan.specialRequirements || 'None'}

Available Caregivers:
${JSON.stringify(caregiverSummaries, null, 2)}

Rank these caregivers from best to worst match. For each, provide:
1. A score from 0-100
2. 2-3 reasons why they're a good/poor match
3. Any warnings (certification gaps, distance concerns, etc.)

Return as JSON array:
[
  {
    "caregiverId": "...",
    "score": 85,
    "reasons": ["...", "..."],
    "warnings": ["..."]
  }
]`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private addMinutes(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }
}
```

## Open Shifts

When caregivers aren't available, create open shifts:

```typescript
// verticals/scheduling-visits/src/services/open-shift-service.ts
export interface OpenShift {
  id: string;
  clientId: string;
  carePlanId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: 'open' | 'claimed' | 'filled' | 'cancelled';
  requiredCertifications: string[];
  hourlyRate: number;
  claimedBy?: string;
  claimedAt?: Date;
}

export class OpenShiftService {
  async createOpenShift(visit: Visit): Promise<OpenShift> {
    const carePlan = await db.query(
      `SELECT * FROM care_plans WHERE id = $1`,
      [visit.carePlanId]
    );

    const result = await db.query(
      `INSERT INTO open_shifts
       (client_id, care_plan_id, scheduled_start, scheduled_end,
        required_certifications, hourly_rate, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING *`,
      [
        visit.clientId,
        visit.carePlanId,
        visit.scheduledStart,
        visit.scheduledEnd,
        carePlan.rows[0].required_certifications,
        carePlan.rows[0].hourly_rate,
      ]
    );

    // Notify eligible caregivers
    await this.notifyEligibleCaregivers(result.rows[0]);

    return result.rows[0];
  }

  async claimShift(shiftId: string, caregiverId: string): Promise<OpenShift> {
    await db.query('BEGIN');

    try {
      // Verify shift is still open
      const shift = await db.query(
        `SELECT * FROM open_shifts WHERE id = $1 FOR UPDATE`,
        [shiftId]
      );

      if (shift.rows[0].status !== 'open') {
        throw new Error('Shift is no longer available');
      }

      // Verify caregiver is eligible
      const eligible = await this.isCaregiverEligible(
        caregiverId,
        shift.rows[0]
      );

      if (!eligible) {
        throw new Error('Caregiver does not meet requirements');
      }

      // Update shift
      const result = await db.query(
        `UPDATE open_shifts
         SET status = 'claimed', claimed_by = $2, claimed_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [shiftId, caregiverId]
      );

      // Create the visit assignment
      await db.query(
        `UPDATE visits
         SET caregiver_id = $1, status = 'scheduled'
         WHERE client_id = $2
           AND care_plan_id = $3
           AND scheduled_start = $4`,
        [
          caregiverId,
          result.rows[0].client_id,
          result.rows[0].care_plan_id,
          result.rows[0].scheduled_start,
        ]
      );

      await db.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  private async isCaregiverEligible(
    caregiverId: string,
    shift: OpenShift
  ): Promise<boolean> {
    const caregiver = await db.query(
      `SELECT * FROM caregivers WHERE id = $1`,
      [caregiverId]
    );

    if (caregiver.rows[0].status !== 'active') {
      return false;
    }

    // Check certifications
    const certs = caregiver.rows[0].certifications as Certification[];
    const required = shift.requiredCertifications;

    for (const req of required) {
      const hasCert = certs.some(
        (c) => c.type === req && new Date(c.expirationDate) > new Date()
      );
      if (!hasCert) return false;
    }

    // Check availability
    const conflicts = await db.query(
      `SELECT COUNT(*) as count FROM visits
       WHERE caregiver_id = $1
         AND status NOT IN ('cancelled')
         AND (
           (scheduled_start <= $2 AND scheduled_end > $2)
           OR (scheduled_start < $3 AND scheduled_end >= $3)
           OR (scheduled_start >= $2 AND scheduled_end <= $3)
         )`,
      [caregiverId, shift.scheduledStart, shift.scheduledEnd]
    );

    return parseInt(conflicts.rows[0].count) === 0;
  }
}
```

## Vibe Coding Caregiver Features

When building caregiver management with AI:

> "Create a caregiver availability system with recurring weekly schedules and time-off requests"

> "Build an AI-powered caregiver matching service that considers certifications, distance, language, and past care history"

> "Implement an open shift system where caregivers can claim unassigned visits"

> "Add certification expiration tracking with automated compliance alerts"

The AI understands healthcare staffing patterns. Describe the workflow, get the code.

## Next Steps

With caregivers matched to patients, we need to verify they actually provide care. In the next chapter, we'll implement Electronic Visit Verification—the compliance requirement that tracks every visit with timestamps, GPS, and signatures.
