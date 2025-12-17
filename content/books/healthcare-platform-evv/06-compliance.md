# Compliance and Reporting

Healthcare is heavily regulated. Agencies face audits from state Medicaid programs, CMS, accreditation bodies, and payers. Compliance isn't optional—it's survival. This chapter covers building systems that keep agencies audit-ready.

## Compliance Requirements

Home healthcare agencies must comply with:

- **State Medicaid rules** - Vary by state, cover EVV, documentation, staffing
- **Medicare Conditions of Participation** - For Medicare-certified agencies
- **HIPAA** - Patient privacy and data security
- **Labor laws** - Overtime, minimum wage, breaks
- **Accreditation standards** - CHAP, ACHC, Joint Commission

## Automated Compliance Checking

Build proactive compliance monitoring:

```typescript
// verticals/compliance/src/services/compliance-checker-service.ts
import { db } from '@folkcare/core';

export interface ComplianceIssue {
  id: string;
  entityType: 'caregiver' | 'client' | 'visit' | 'invoice' | 'authorization';
  entityId: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'evv' | 'certification' | 'documentation' | 'billing' | 'labor';
  severity: ComplianceIssue['severity'];
  checkFn: () => Promise<ComplianceIssue[]>;
}

export class ComplianceCheckerService {
  private rules: ComplianceRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules() {
    // EVV Rules
    this.rules.push({
      id: 'evv-missing-clockout',
      name: 'Missing EVV Clock-Out',
      description: 'Visits without clock-out after scheduled end time',
      category: 'evv',
      severity: 'critical',
      checkFn: this.checkMissingClockouts.bind(this),
    });

    this.rules.push({
      id: 'evv-location-mismatch',
      name: 'EVV Location Discrepancy',
      description: 'Clock-in/out location far from client address',
      category: 'evv',
      severity: 'warning',
      checkFn: this.checkLocationMismatches.bind(this),
    });

    // Certification Rules
    this.rules.push({
      id: 'cert-expired',
      name: 'Expired Certification',
      description: 'Caregivers with expired required certifications',
      category: 'certification',
      severity: 'critical',
      checkFn: this.checkExpiredCertifications.bind(this),
    });

    this.rules.push({
      id: 'cert-expiring-soon',
      name: 'Certification Expiring Soon',
      description: 'Certifications expiring within 30 days',
      category: 'certification',
      severity: 'warning',
      checkFn: this.checkExpiringCertifications.bind(this),
    });

    // Documentation Rules
    this.rules.push({
      id: 'doc-missing-signature',
      name: 'Missing Client Signature',
      description: 'Completed visits without client signature',
      category: 'documentation',
      severity: 'warning',
      checkFn: this.checkMissingSignatures.bind(this),
    });

    this.rules.push({
      id: 'doc-missing-notes',
      name: 'Missing Visit Notes',
      description: 'Completed visits without caregiver notes',
      category: 'documentation',
      severity: 'info',
      checkFn: this.checkMissingNotes.bind(this),
    });

    // Labor Rules
    this.rules.push({
      id: 'labor-overtime',
      name: 'Overtime Threshold Exceeded',
      description: 'Caregivers exceeding weekly hour limits',
      category: 'labor',
      severity: 'warning',
      checkFn: this.checkOvertimeViolations.bind(this),
    });
  }

  async runAllChecks(): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    for (const rule of this.rules) {
      const ruleIssues = await rule.checkFn();
      issues.push(...ruleIssues.map((issue) => ({
        ...issue,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
      })));
    }

    // Store new issues
    await this.storeIssues(issues);

    return issues;
  }

  async runCheck(ruleId: string): Promise<ComplianceIssue[]> {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) throw new Error(`Unknown rule: ${ruleId}`);

    const issues = await rule.checkFn();
    return issues.map((issue) => ({
      ...issue,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
    }));
  }

  // Individual check implementations
  private async checkMissingClockouts(): Promise<Partial<ComplianceIssue>[]> {
    const result = await db.query(
      `SELECT v.id, v.client_id, v.caregiver_id, v.scheduled_end,
              c.first_name as client_name, cg.first_name as caregiver_name
       FROM visits v
       JOIN clients c ON c.id = v.client_id
       JOIN caregivers cg ON cg.id = v.caregiver_id
       WHERE v.status = 'in_progress'
         AND v.scheduled_end < NOW() - INTERVAL '1 hour'`
    );

    return result.rows.map((row) => ({
      entityType: 'visit',
      entityId: row.id,
      description: `Visit for ${row.client_name} with ${row.caregiver_name} missing clock-out (scheduled end: ${row.scheduled_end})`,
      detectedAt: new Date(),
    }));
  }

  private async checkExpiredCertifications(): Promise<Partial<ComplianceIssue>[]> {
    const result = await db.query(
      `SELECT cg.id, cg.first_name, cg.last_name, cg.certifications
       FROM caregivers cg
       WHERE cg.status = 'active'`
    );

    const issues: Partial<ComplianceIssue>[] = [];

    for (const row of result.rows) {
      const certs = row.certifications as { type: string; expirationDate: string }[];
      for (const cert of certs) {
        if (new Date(cert.expirationDate) < new Date()) {
          issues.push({
            entityType: 'caregiver',
            entityId: row.id,
            description: `${row.first_name} ${row.last_name}'s ${cert.type} certification expired on ${cert.expirationDate}`,
            detectedAt: new Date(),
          });
        }
      }
    }

    return issues;
  }

  private async checkOvertimeViolations(): Promise<Partial<ComplianceIssue>[]> {
    const result = await db.query(
      `SELECT cg.id, cg.first_name, cg.last_name, cg.max_hours_per_week,
              SUM(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) / 3600) as hours_worked
       FROM caregivers cg
       JOIN visits v ON v.caregiver_id = cg.id
       WHERE v.status = 'completed'
         AND v.actual_start >= DATE_TRUNC('week', NOW())
       GROUP BY cg.id
       HAVING SUM(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) / 3600) > cg.max_hours_per_week`
    );

    return result.rows.map((row) => ({
      entityType: 'caregiver',
      entityId: row.id,
      description: `${row.first_name} ${row.last_name} worked ${row.hours_worked.toFixed(1)} hours this week (limit: ${row.max_hours_per_week})`,
      detectedAt: new Date(),
    }));
  }

  // Additional check methods...
  private async checkLocationMismatches(): Promise<Partial<ComplianceIssue>[]> {
    const result = await db.query(
      `SELECT er.id, er.visit_id, er.exceptions
       FROM evv_records er
       WHERE er.exceptions @> '[{"type": "location_mismatch"}]'
         AND NOT EXISTS (
           SELECT 1 FROM compliance_issues ci
           WHERE ci.entity_id = er.id
             AND ci.rule_id = 'evv-location-mismatch'
             AND ci.resolved_at IS NULL
         )`
    );

    return result.rows.map((row) => ({
      entityType: 'visit',
      entityId: row.visit_id,
      description: 'EVV clock-in/out location does not match client address',
      detectedAt: new Date(),
    }));
  }

  private async checkMissingSignatures(): Promise<Partial<ComplianceIssue>[]> {
    const result = await db.query(
      `SELECT v.id, c.first_name, c.last_name, v.actual_start
       FROM visits v
       JOIN clients c ON c.id = v.client_id
       LEFT JOIN evv_records er ON er.visit_id = v.id
       WHERE v.status = 'completed'
         AND (er.client_signature_url IS NULL OR er.client_signature_url = '')
         AND v.actual_start >= NOW() - INTERVAL '7 days'`
    );

    return result.rows.map((row) => ({
      entityType: 'visit',
      entityId: row.id,
      description: `Visit for ${row.first_name} ${row.last_name} on ${row.actual_start} missing client signature`,
      detectedAt: new Date(),
    }));
  }

  private async checkExpiringCertifications(): Promise<Partial<ComplianceIssue>[]> {
    // Similar to checkExpiredCertifications but for 30-day window
    return [];
  }

  private async checkMissingNotes(): Promise<Partial<ComplianceIssue>[]> {
    return [];
  }

  private async storeIssues(issues: ComplianceIssue[]): Promise<void> {
    for (const issue of issues) {
      await db.query(
        `INSERT INTO compliance_issues
         (entity_type, entity_id, rule_id, rule_name, severity, description, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (entity_id, rule_id) WHERE resolved_at IS NULL
         DO NOTHING`,
        [
          issue.entityType,
          issue.entityId,
          issue.ruleId,
          issue.ruleName,
          issue.severity,
          issue.description,
          issue.detectedAt,
        ]
      );
    }
  }
}
```

## Compliance Dashboard

```typescript
// verticals/compliance/src/routes/compliance-routes.ts
import { Router } from 'express';
import { complianceChecker } from '../services/compliance-checker-service';

const router = Router();

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const [summary, recentIssues, issuesByCategory] = await Promise.all([
      getComplianceSummary(),
      getRecentIssues(20),
      getIssuesByCategory(),
    ]);

    res.json({
      summary,
      recentIssues,
      issuesByCategory,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/check', requireAuth, async (req, res, next) => {
  try {
    const issues = await complianceChecker.runAllChecks();
    res.json({
      issuesFound: issues.length,
      critical: issues.filter((i) => i.severity === 'critical').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      issues,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/issues/:id/resolve', requireAuth, async (req, res, next) => {
  try {
    const { resolution } = req.body;

    await db.query(
      `UPDATE compliance_issues
       SET resolved_at = NOW(), resolved_by = $2, resolution = $3
       WHERE id = $1`,
      [req.params.id, req.user.id, resolution]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as complianceRoutes };
```

## Report Generation

Generate compliance reports for audits:

```typescript
// verticals/compliance/src/services/report-service.ts

export interface ComplianceReport {
  reportType: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: ReportSummary;
  sections: ReportSection[];
}

export class ReportService {
  async generateEVVComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const [
      visitStats,
      evvStats,
      exceptionStats,
      aggregatorStats,
    ] = await Promise.all([
      this.getVisitStats(startDate, endDate),
      this.getEVVStats(startDate, endDate),
      this.getExceptionStats(startDate, endDate),
      this.getAggregatorStats(startDate, endDate),
    ]);

    return {
      reportType: 'EVV Compliance',
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary: {
        totalVisits: visitStats.total,
        compliantVisits: evvStats.compliant,
        complianceRate: (evvStats.compliant / visitStats.total) * 100,
        aggregatorSubmissionRate: aggregatorStats.submitted / evvStats.total * 100,
      },
      sections: [
        {
          title: 'Visit Summary',
          data: visitStats,
        },
        {
          title: 'EVV Verification',
          data: evvStats,
        },
        {
          title: 'Exceptions by Type',
          data: exceptionStats,
        },
        {
          title: 'Aggregator Submission',
          data: aggregatorStats,
        },
      ],
    };
  }

  async generateCaregiverComplianceReport(
    caregiverId?: string
  ): Promise<ComplianceReport> {
    const caregivers = caregiverId
      ? [await this.getCaregiver(caregiverId)]
      : await this.getAllActiveCaregivers();

    const sections: ReportSection[] = [];

    for (const caregiver of caregivers) {
      const certStatus = await this.getCertificationStatus(caregiver.id);
      const trainingStatus = await this.getTrainingStatus(caregiver.id);
      const performanceMetrics = await this.getPerformanceMetrics(caregiver.id);

      sections.push({
        title: `${caregiver.firstName} ${caregiver.lastName}`,
        data: {
          certifications: certStatus,
          training: trainingStatus,
          performance: performanceMetrics,
        },
      });
    }

    return {
      reportType: 'Caregiver Compliance',
      generatedAt: new Date(),
      period: { start: new Date(), end: new Date() },
      summary: {
        totalCaregivers: caregivers.length,
        fullyCompliant: sections.filter((s) => s.data.certifications.allValid).length,
      },
      sections,
    };
  }

  async generateBillingComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const [
      invoiceStats,
      authorizationStats,
      claimStats,
    ] = await Promise.all([
      this.getInvoiceStats(startDate, endDate),
      this.getAuthorizationStats(startDate, endDate),
      this.getClaimStats(startDate, endDate),
    ]);

    return {
      reportType: 'Billing Compliance',
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary: {
        totalBilled: invoiceStats.totalAmount,
        collectionRate: invoiceStats.collected / invoiceStats.totalAmount * 100,
        authorizationUtilization: authorizationStats.used / authorizationStats.authorized * 100,
      },
      sections: [
        { title: 'Invoice Summary', data: invoiceStats },
        { title: 'Authorization Usage', data: authorizationStats },
        { title: 'Claim Status', data: claimStats },
      ],
    };
  }

  private async getVisitStats(start: Date, end: Date): Promise<VisitStats> {
    const result = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
         COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
         COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show
       FROM visits
       WHERE scheduled_start >= $1 AND scheduled_start <= $2`,
      [start, end]
    );

    return result.rows[0];
  }

  // Additional helper methods...
}
```

## Audit Trail

Comprehensive audit logging for compliance:

```typescript
// packages/core/src/audit/comprehensive-logger.ts

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  userRole?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'print'
  | 'access_denied';

export class AuditLogger {
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    await db.query(
      `INSERT INTO audit_log
       (user_id, user_role, action, entity_type, entity_id, description,
        previous_state, new_state, ip_address, user_agent, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event.userId,
        event.userRole,
        event.action,
        event.entityType,
        event.entityId,
        event.description,
        JSON.stringify(event.previousState),
        JSON.stringify(event.newState),
        event.ipAddress,
        event.userAgent,
        event.sessionId,
      ]
    );
  }

  async getAuditTrail(
    entityType: string,
    entityId: string
  ): Promise<AuditEvent[]> {
    const result = await db.query(
      `SELECT * FROM audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY timestamp DESC`,
      [entityType, entityId]
    );

    return result.rows;
  }

  async getUserActivity(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditEvent[]> {
    const result = await db.query(
      `SELECT * FROM audit_log
       WHERE user_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
       ORDER BY timestamp DESC`,
      [userId, startDate, endDate]
    );

    return result.rows;
  }

  async getSecurityEvents(days: number): Promise<AuditEvent[]> {
    const result = await db.query(
      `SELECT * FROM audit_log
       WHERE action IN ('login', 'logout', 'access_denied')
         AND timestamp >= NOW() - INTERVAL '${days} days'
       ORDER BY timestamp DESC`
    );

    return result.rows;
  }
}
```

## Vibe Coding Compliance

When building compliance features with AI:

> "Create an automated compliance checker that validates EVV records, caregiver certifications, and visit documentation"

> "Build a report generator for EVV compliance that shows verification rates and exception trends"

> "Implement comprehensive audit logging that tracks all PHI access and modifications"

> "Add compliance dashboard endpoints showing current issues grouped by severity and category"

AI understands healthcare regulations. Describe your compliance requirements, get the checking logic.

## Next Steps

With compliance monitoring in place, we can add the final layer: AI-powered features that make the platform smarter. In the next chapter, we'll build natural language care plan generation, churn prediction, and intelligent alerts.
