# Electronic Visit Verification

Electronic Visit Verification (EVV) is federally mandated for Medicaid-funded home healthcare services. It's not optional—agencies that don't comply don't get paid. This chapter covers building a compliant EVV system.

## EVV Requirements

The 21st Century Cures Act requires verifying six elements:

1. **Type of service** - What care was provided
2. **Individual receiving service** - Patient identity
3. **Individual providing service** - Caregiver identity
4. **Date of service** - When the visit occurred
5. **Time in/out** - Start and end times
6. **Location** - Where service was delivered

States implement EVV through aggregators—centralized systems that collect data from all providers. Your software must submit to these aggregators.

## EVV Data Model

```typescript
// verticals/scheduling-visits/src/types/evv.ts
export interface EVVRecord {
  id: string;
  visitId: string;

  // The six required elements
  serviceType: string;
  clientVerified: boolean;
  caregiverVerified: boolean;
  serviceDate: Date;
  clockInTime: Date;
  clockOutTime: Date;
  clockInLocation: GeoLocation;
  clockOutLocation: GeoLocation;

  // Verification methods
  verificationMethod: EVVVerificationMethod;
  clientSignature?: string; // Base64 or URL
  caregiverSignature?: string;

  // Aggregator submission
  submittedToAggregator: boolean;
  aggregatorSubmissionTime?: Date;
  aggregatorResponse?: AggregatorResponse;
  aggregatorRecordId?: string;

  // Exceptions and notes
  exceptions: EVVException[];
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  capturedAt: Date;
}

export type EVVVerificationMethod =
  | 'mobile_gps'           // GPS from mobile app
  | 'telephony'            // Call-in/call-out
  | 'fixed_device'         // Device at client home
  | 'biometric'            // Fingerprint, face ID
  | 'manual_attestation';  // Paper backup

export interface EVVException {
  type: EVVExceptionType;
  reason: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export type EVVExceptionType =
  | 'location_mismatch'    // GPS doesn't match client address
  | 'time_discrepancy'     // Clock times don't match schedule
  | 'missing_signature'    // Signature not captured
  | 'early_clockin'        // Arrived too early
  | 'late_clockout'        // Left too late
  | 'no_gps'               // Location couldn't be captured
  | 'manual_entry';        // Data entered manually (needs review)

export interface AggregatorResponse {
  status: 'accepted' | 'rejected' | 'pending';
  recordId?: string;
  errors?: string[];
  warnings?: string[];
}
```

## Clock-In/Clock-Out Service

The core EVV functionality:

```typescript
// verticals/scheduling-visits/src/services/evv-service.ts
import { db } from '@folkcare/core';

const MAX_DISTANCE_METERS = 150; // Maximum distance from client address
const EARLY_CLOCKIN_MINUTES = 15; // How early is acceptable
const LATE_CLOCKOUT_MINUTES = 30; // How late is acceptable

export class EVVService {
  async clockIn(
    visitId: string,
    caregiverId: string,
    location: GeoLocation,
    verificationMethod: EVVVerificationMethod
  ): Promise<EVVRecord> {
    // Get visit details
    const visit = await this.getVisit(visitId);

    if (!visit) {
      throw new Error('Visit not found');
    }

    if (visit.caregiverId !== caregiverId) {
      throw new Error('Caregiver not assigned to this visit');
    }

    // Get client location
    const client = await this.getClient(visit.clientId);

    // Validate location
    const exceptions: EVVException[] = [];
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      client.latitude,
      client.longitude
    );

    if (distance > MAX_DISTANCE_METERS) {
      exceptions.push({
        type: 'location_mismatch',
        reason: `GPS location ${Math.round(distance)}m from client address (max ${MAX_DISTANCE_METERS}m)`,
      });
    }

    // Validate timing
    const scheduledStart = new Date(visit.scheduledStart);
    const minutesEarly = (scheduledStart.getTime() - location.capturedAt.getTime()) / 60000;

    if (minutesEarly > EARLY_CLOCKIN_MINUTES) {
      exceptions.push({
        type: 'early_clockin',
        reason: `Clocked in ${Math.round(minutesEarly)} minutes early`,
      });
    }

    // Create EVV record
    const result = await db.query(
      `INSERT INTO evv_records
       (visit_id, service_type, clock_in_time, clock_in_latitude,
        clock_in_longitude, clock_in_accuracy, verification_method,
        caregiver_verified, exceptions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       RETURNING *`,
      [
        visitId,
        visit.serviceType,
        location.capturedAt,
        location.latitude,
        location.longitude,
        location.accuracy,
        verificationMethod,
        JSON.stringify(exceptions),
      ]
    );

    // Update visit status
    await db.query(
      `UPDATE visits
       SET status = 'in_progress', actual_start = $2,
           clock_in_latitude = $3, clock_in_longitude = $4
       WHERE id = $1`,
      [visitId, location.capturedAt, location.latitude, location.longitude]
    );

    return this.mapRow(result.rows[0]);
  }

  async clockOut(
    visitId: string,
    caregiverId: string,
    location: GeoLocation,
    clientSignature?: string,
    caregiverSignature?: string,
    notes?: string
  ): Promise<EVVRecord> {
    // Get existing EVV record
    const evvRecord = await this.getEVVRecordByVisit(visitId);

    if (!evvRecord) {
      throw new Error('No clock-in record found');
    }

    const visit = await this.getVisit(visitId);
    const client = await this.getClient(visit.clientId);

    // Validate location
    const exceptions = [...evvRecord.exceptions];
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      client.latitude,
      client.longitude
    );

    if (distance > MAX_DISTANCE_METERS) {
      exceptions.push({
        type: 'location_mismatch',
        reason: `Clock-out GPS ${Math.round(distance)}m from client address`,
      });
    }

    // Validate timing
    const scheduledEnd = new Date(visit.scheduledEnd);
    const minutesLate = (location.capturedAt.getTime() - scheduledEnd.getTime()) / 60000;

    if (minutesLate > LATE_CLOCKOUT_MINUTES) {
      exceptions.push({
        type: 'late_clockout',
        reason: `Clocked out ${Math.round(minutesLate)} minutes late`,
      });
    }

    // Check for missing signatures
    if (!clientSignature) {
      exceptions.push({
        type: 'missing_signature',
        reason: 'Client signature not captured',
      });
    }

    // Update EVV record
    const result = await db.query(
      `UPDATE evv_records
       SET clock_out_time = $2,
           clock_out_latitude = $3,
           clock_out_longitude = $4,
           clock_out_accuracy = $5,
           client_signature_url = $6,
           caregiver_signature_url = $7,
           client_verified = $8,
           exceptions = $9,
           notes = $10,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        evvRecord.id,
        location.capturedAt,
        location.latitude,
        location.longitude,
        location.accuracy,
        clientSignature,
        caregiverSignature,
        !!clientSignature,
        JSON.stringify(exceptions),
        notes,
      ]
    );

    // Update visit status
    await db.query(
      `UPDATE visits
       SET status = 'completed', actual_end = $2,
           clock_out_latitude = $3, clock_out_longitude = $4,
           notes = $5
       WHERE id = $1`,
      [visitId, location.capturedAt, location.latitude, location.longitude, notes]
    );

    // Trigger aggregator submission
    await this.queueAggregatorSubmission(result.rows[0].id);

    return this.mapRow(result.rows[0]);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
```

## Mobile App Clock-In Flow

The caregiver mobile app handles EVV:

```typescript
// Example React Native component structure
// mobile/src/screens/ClockInScreen.tsx

interface ClockInScreenProps {
  visit: Visit;
}

export function ClockInScreen({ visit }: ClockInScreenProps) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Request location on mount
    requestLocationPermission();
    captureLocation();
  }, []);

  const captureLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(),
      });
    } catch (err) {
      setError('Could not get location. Please enable GPS.');
    }
  };

  const handleClockIn = async () => {
    if (!location) {
      setError('Location required for clock-in');
      return;
    }

    setLoading(true);
    try {
      await api.clockIn(visit.id, location);
      navigation.navigate('VisitInProgress', { visitId: visit.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <VisitHeader visit={visit} />

      <LocationIndicator
        location={location}
        clientAddress={visit.clientAddress}
        isWithinRange={location ? isWithinRange(location, visit) : false}
      />

      {error && <ErrorMessage message={error} />}

      <Button
        title="Clock In"
        onPress={handleClockIn}
        loading={loading}
        disabled={!location}
      />

      <Text style={styles.disclaimer}>
        By clocking in, you verify that you are at the client's location
        and ready to provide care.
      </Text>
    </View>
  );
}
```

## Signature Capture

Signatures verify client participation:

```typescript
// mobile/src/components/SignatureCapture.tsx
import SignatureCanvas from 'react-native-signature-canvas';

interface SignatureCaptureProps {
  onSave: (signatureBase64: string) => void;
  title: string;
}

export function SignatureCapture({ onSave, title }: SignatureCaptureProps) {
  const signatureRef = useRef<SignatureCanvas>(null);

  const handleSave = () => {
    signatureRef.current?.readSignature();
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleOK = (signature: string) => {
    // signature is base64 PNG
    onSave(signature);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.canvasContainer}>
        <SignatureCanvas
          ref={signatureRef}
          onOK={handleOK}
          webStyle={signatureWebStyle}
          autoClear={false}
        />
      </View>

      <View style={styles.buttons}>
        <Button title="Clear" onPress={handleClear} variant="outline" />
        <Button title="Save" onPress={handleSave} />
      </View>

      <Text style={styles.disclaimer}>
        Sign above to confirm services were provided as documented.
      </Text>
    </View>
  );
}

const signatureWebStyle = `
  .m-signature-pad { box-shadow: none; border: 1px solid #ccc; }
  .m-signature-pad--body { border: none; }
`;
```

## Aggregator Integration

Each state has an EVV aggregator. Here's a generic integration:

```typescript
// verticals/scheduling-visits/src/services/aggregator-service.ts

export interface AggregatorConfig {
  apiUrl: string;
  apiKey: string;
  providerId: string;
  stateCode: string;
}

export class AggregatorService {
  constructor(private config: AggregatorConfig) {}

  async submitVisit(evvRecord: EVVRecord, visit: Visit, client: Client, caregiver: Caregiver): Promise<AggregatorResponse> {
    // Transform to aggregator format
    const payload = this.transformToAggregatorFormat(
      evvRecord,
      visit,
      client,
      caregiver
    );

    try {
      const response = await fetch(`${this.config.apiUrl}/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Provider-ID': this.config.providerId,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        // Update EVV record with aggregator response
        await db.query(
          `UPDATE evv_records
           SET submitted_to_aggregator = true,
               aggregator_submission_time = NOW(),
               aggregator_record_id = $2,
               aggregator_response = $3
           WHERE id = $1`,
          [evvRecord.id, result.recordId, JSON.stringify(result)]
        );

        return {
          status: 'accepted',
          recordId: result.recordId,
        };
      } else {
        return {
          status: 'rejected',
          errors: result.errors || [result.message],
        };
      }
    } catch (error) {
      return {
        status: 'rejected',
        errors: [`Network error: ${error.message}`],
      };
    }
  }

  private transformToAggregatorFormat(
    evvRecord: EVVRecord,
    visit: Visit,
    client: Client,
    caregiver: Caregiver
  ): AggregatorPayload {
    // Format varies by state - this is a common structure
    return {
      providerId: this.config.providerId,
      clientId: client.medicaidId,
      workerId: caregiver.id,
      serviceCode: visit.serviceType,
      serviceDate: evvRecord.serviceDate.toISOString().split('T')[0],
      startTime: evvRecord.clockInTime.toISOString(),
      endTime: evvRecord.clockOutTime.toISOString(),
      startLocation: {
        latitude: evvRecord.clockInLocation.latitude,
        longitude: evvRecord.clockInLocation.longitude,
      },
      endLocation: {
        latitude: evvRecord.clockOutLocation.latitude,
        longitude: evvRecord.clockOutLocation.longitude,
      },
      verificationMethod: this.mapVerificationMethod(evvRecord.verificationMethod),
      clientSignature: evvRecord.clientVerified,
    };
  }

  private mapVerificationMethod(method: EVVVerificationMethod): string {
    const mapping: Record<EVVVerificationMethod, string> = {
      mobile_gps: 'GPS',
      telephony: 'TEL',
      fixed_device: 'FVV',
      biometric: 'BIO',
      manual_attestation: 'MAN',
    };
    return mapping[method];
  }
}
```

## Exception Handling

EVV exceptions need review and resolution:

```typescript
// verticals/scheduling-visits/src/services/evv-exception-service.ts

export class EVVExceptionService {
  async getUnresolvedExceptions(): Promise<EVVRecordWithExceptions[]> {
    const result = await db.query(
      `SELECT er.*, v.*, c.first_name as client_name, cg.first_name as caregiver_name
       FROM evv_records er
       JOIN visits v ON v.id = er.visit_id
       JOIN clients c ON c.id = v.client_id
       JOIN caregivers cg ON cg.id = v.caregiver_id
       WHERE er.exceptions != '[]'::jsonb
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(er.exceptions) ex
           WHERE ex->>'resolvedAt' IS NOT NULL
         )
       ORDER BY er.created_at DESC`
    );

    return result.rows;
  }

  async resolveException(
    evvRecordId: string,
    exceptionIndex: number,
    resolution: string,
    userId: string
  ): Promise<void> {
    const record = await db.query(
      `SELECT exceptions FROM evv_records WHERE id = $1`,
      [evvRecordId]
    );

    const exceptions = record.rows[0].exceptions;
    exceptions[exceptionIndex] = {
      ...exceptions[exceptionIndex],
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
      resolution,
    };

    await db.query(
      `UPDATE evv_records
       SET exceptions = $2, updated_at = NOW()
       WHERE id = $1`,
      [evvRecordId, JSON.stringify(exceptions)]
    );
  }

  async flagForReview(evvRecordId: string, reason: string): Promise<void> {
    await db.query(
      `INSERT INTO evv_reviews
       (evv_record_id, reason, status, created_at)
       VALUES ($1, $2, 'pending', NOW())`,
      [evvRecordId, reason]
    );
  }
}
```

## Vibe Coding EVV

When building EVV features with AI:

> "Create a clock-in/clock-out service that validates GPS location against client address and flags discrepancies"

> "Build an aggregator integration service that transforms EVV records to the state's required format and handles submission"

> "Implement an exception review workflow for EVV records with location or time discrepancies"

> "Add a signature capture component that stores signatures as base64 and validates presence"

AI knows EVV requirements. Describe your state's specific rules, and it adapts the code.

## Testing EVV

EVV is compliance-critical. Test thoroughly:

```typescript
describe('EVVService', () => {
  describe('clockIn', () => {
    it('should flag location mismatch when GPS is far from client', async () => {
      const visit = await createTestVisit();
      const farLocation = {
        latitude: visit.clientLatitude + 0.01, // ~1km away
        longitude: visit.clientLongitude,
        accuracy: 10,
        capturedAt: new Date(),
      };

      const result = await evvService.clockIn(
        visit.id,
        visit.caregiverId,
        farLocation,
        'mobile_gps'
      );

      expect(result.exceptions).toContainEqual(
        expect.objectContaining({ type: 'location_mismatch' })
      );
    });

    it('should flag early clock-in', async () => {
      const visit = await createTestVisit({
        scheduledStart: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });

      const result = await evvService.clockIn(
        visit.id,
        visit.caregiverId,
        validLocation,
        'mobile_gps'
      );

      expect(result.exceptions).toContainEqual(
        expect.objectContaining({ type: 'early_clockin' })
      );
    });
  });
});
```

## Next Steps

With EVV capturing visit data, we need to bill for services. In the next chapter, we'll build the billing and invoicing system that turns verified visits into revenue.
