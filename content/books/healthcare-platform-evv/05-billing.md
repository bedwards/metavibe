# Billing and Invoicing

Healthcare billing is complex. Multiple payers, different rates, authorization limits, claim submissions—all need to work together. This chapter covers building a billing system that handles real-world complexity.

## Healthcare Billing Models

Home healthcare gets paid through several channels:

- **Medicaid** - Government insurance for low-income individuals
- **Medicare** - Government insurance for seniors/disabled
- **Private Insurance** - Commercial health plans
- **Private Pay** - Out-of-pocket from patients/families
- **Managed Care Organizations (MCOs)** - Insurance companies administering Medicaid

Each payer has different:
- Reimbursement rates
- Authorization requirements
- Claim submission formats
- Payment timelines

## Billing Data Model

```typescript
// verticals/billing-invoicing/src/types.ts
export interface Payer {
  id: string;
  name: string;
  type: 'medicaid' | 'medicare' | 'private_insurance' | 'private_pay' | 'mco';
  billingAddress?: Address;
  submissionMethod: 'electronic' | 'paper' | 'portal';
  paymentTermsDays: number;
  defaultRates: ServiceRate[];
}

export interface ServiceRate {
  serviceCode: string;
  serviceName: string;
  unitType: 'hour' | '15min' | 'visit' | 'day';
  rate: number;
  effectiveDate: Date;
  expirationDate?: Date;
}

export interface Authorization {
  id: string;
  clientId: string;
  payerId: string;
  authorizationNumber: string;
  serviceCode: string;
  startDate: Date;
  endDate: Date;
  authorizedUnits: number;
  usedUnits: number;
  unitType: 'hour' | '15min' | 'visit';
  status: 'active' | 'expired' | 'exhausted';
}

export interface Invoice {
  id: string;
  payerId: string;
  clientId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void';
  lineItems: InvoiceLineItem[];
  subtotal: number;
  adjustments: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  visitId: string;
  serviceDate: Date;
  serviceCode: string;
  description: string;
  units: number;
  unitRate: number;
  amount: number;
  authorizationId?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: 'check' | 'ach' | 'credit_card' | 'remittance';
  referenceNumber?: string;
  notes?: string;
}
```

## Billing Service

```typescript
// verticals/billing-invoicing/src/services/billing-service.ts
import { db } from '@folkcare/core';

export class BillingService {
  async generateInvoice(
    payerId: string,
    clientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Invoice> {
    // Get billable visits in date range
    const visits = await this.getBillableVisits(
      clientId,
      payerId,
      startDate,
      endDate
    );

    if (visits.length === 0) {
      throw new Error('No billable visits in date range');
    }

    // Get payer rates
    const payer = await this.getPayer(payerId);
    const rates = new Map(payer.defaultRates.map((r) => [r.serviceCode, r]));

    // Generate line items
    const lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId'>[] = [];

    for (const visit of visits) {
      const rate = rates.get(visit.serviceType);
      if (!rate) {
        console.warn(`No rate for service ${visit.serviceType}`);
        continue;
      }

      const units = this.calculateUnits(
        visit.actualStart,
        visit.actualEnd,
        rate.unitType
      );

      const amount = units * rate.rate;

      lineItems.push({
        visitId: visit.id,
        serviceDate: visit.actualStart,
        serviceCode: visit.serviceType,
        description: `${rate.serviceName} - ${visit.caregiverName}`,
        units,
        unitRate: rate.rate,
        amount,
        authorizationId: visit.authorizationId,
      });
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const total = subtotal; // Adjustments handled separately

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice
    const result = await db.query(
      `INSERT INTO invoices
       (payer_id, client_id, invoice_number, invoice_date, due_date,
        status, subtotal, adjustments, total, amount_paid, balance)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${payer.paymentTermsDays} days',
               'draft', $4, 0, $5, 0, $5)
       RETURNING *`,
      [payerId, clientId, invoiceNumber, subtotal, total]
    );

    const invoice = result.rows[0];

    // Insert line items
    for (const item of lineItems) {
      await db.query(
        `INSERT INTO invoice_line_items
         (invoice_id, visit_id, service_date, service_code, description,
          units, unit_rate, amount, authorization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          invoice.id,
          item.visitId,
          item.serviceDate,
          item.serviceCode,
          item.description,
          item.units,
          item.unitRate,
          item.amount,
          item.authorizationId,
        ]
      );

      // Mark visit as billed
      await db.query(
        `UPDATE visits SET billed = true, invoice_id = $2 WHERE id = $1`,
        [item.visitId, invoice.id]
      );

      // Update authorization usage
      if (item.authorizationId) {
        await this.updateAuthorizationUsage(item.authorizationId, item.units);
      }
    }

    return this.getInvoice(invoice.id);
  }

  private calculateUnits(
    start: Date,
    end: Date,
    unitType: ServiceRate['unitType']
  ): number {
    const minutes = (end.getTime() - start.getTime()) / 60000;

    switch (unitType) {
      case 'hour':
        return Math.ceil(minutes / 60 * 4) / 4; // Round to nearest 15 min
      case '15min':
        return Math.ceil(minutes / 15);
      case 'visit':
        return 1;
      case 'day':
        return 1;
      default:
        return minutes / 60;
    }
  }

  async recordPayment(
    invoiceId: string,
    amount: number,
    paymentMethod: Payment['paymentMethod'],
    referenceNumber?: string
  ): Promise<Payment> {
    const invoice = await this.getInvoice(invoiceId);

    if (amount > invoice.balance) {
      throw new Error('Payment exceeds invoice balance');
    }

    const result = await db.query(
      `INSERT INTO payments
       (invoice_id, payment_date, amount, payment_method, reference_number)
       VALUES ($1, NOW(), $2, $3, $4)
       RETURNING *`,
      [invoiceId, amount, paymentMethod, referenceNumber]
    );

    // Update invoice
    const newAmountPaid = invoice.amountPaid + amount;
    const newBalance = invoice.total - newAmountPaid;
    const newStatus = newBalance === 0 ? 'paid' : 'partial';

    await db.query(
      `UPDATE invoices
       SET amount_paid = $2, balance = $3, status = $4, updated_at = NOW()
       WHERE id = $1`,
      [invoiceId, newAmountPaid, newBalance, newStatus]
    );

    return result.rows[0];
  }

  async getOutstandingInvoices(payerId?: string): Promise<Invoice[]> {
    let query = `
      SELECT i.*, p.name as payer_name, c.first_name, c.last_name
      FROM invoices i
      JOIN payers p ON p.id = i.payer_id
      JOIN clients c ON c.id = i.client_id
      WHERE i.status IN ('sent', 'partial', 'overdue')
    `;

    const params: unknown[] = [];
    if (payerId) {
      query += ` AND i.payer_id = $1`;
      params.push(payerId);
    }

    query += ` ORDER BY i.due_date`;

    const result = await db.query(query, params);
    return result.rows.map(this.mapInvoiceRow);
  }

  async markOverdueInvoices(): Promise<number> {
    const result = await db.query(
      `UPDATE invoices
       SET status = 'overdue'
       WHERE status = 'sent'
         AND due_date < NOW()
       RETURNING id`
    );

    return result.rows.length;
  }
}
```

## Authorization Tracking

Payers authorize specific hours. Track usage:

```typescript
// verticals/billing-invoicing/src/services/authorization-service.ts

export class AuthorizationService {
  async createAuthorization(input: CreateAuthorizationInput): Promise<Authorization> {
    const result = await db.query(
      `INSERT INTO authorizations
       (client_id, payer_id, authorization_number, service_code,
        start_date, end_date, authorized_units, used_units, unit_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'active')
       RETURNING *`,
      [
        input.clientId,
        input.payerId,
        input.authorizationNumber,
        input.serviceCode,
        input.startDate,
        input.endDate,
        input.authorizedUnits,
        input.unitType,
      ]
    );

    return result.rows[0];
  }

  async getActiveAuthorization(
    clientId: string,
    payerId: string,
    serviceCode: string,
    serviceDate: Date
  ): Promise<Authorization | null> {
    const result = await db.query(
      `SELECT * FROM authorizations
       WHERE client_id = $1
         AND payer_id = $2
         AND service_code = $3
         AND start_date <= $4
         AND end_date >= $4
         AND status = 'active'
       ORDER BY end_date
       LIMIT 1`,
      [clientId, payerId, serviceCode, serviceDate]
    );

    return result.rows[0] || null;
  }

  async checkAuthorizationAvailability(
    authorizationId: string,
    requestedUnits: number
  ): Promise<AuthorizationAvailability> {
    const auth = await this.getAuthorization(authorizationId);

    const remainingUnits = auth.authorizedUnits - auth.usedUnits;
    const percentUsed = (auth.usedUnits / auth.authorizedUnits) * 100;

    return {
      authorization: auth,
      remainingUnits,
      percentUsed,
      canAccommodate: remainingUnits >= requestedUnits,
      daysUntilExpiration: this.daysUntil(new Date(auth.endDate)),
    };
  }

  async updateUsage(authorizationId: string, units: number): Promise<void> {
    await db.query(
      `UPDATE authorizations
       SET used_units = used_units + $2,
           status = CASE
             WHEN used_units + $2 >= authorized_units THEN 'exhausted'
             ELSE status
           END
       WHERE id = $1`,
      [authorizationId, units]
    );
  }

  async getExpiringAuthorizations(daysAhead: number): Promise<Authorization[]> {
    const result = await db.query(
      `SELECT a.*, c.first_name, c.last_name, p.name as payer_name
       FROM authorizations a
       JOIN clients c ON c.id = a.client_id
       JOIN payers p ON p.id = a.payer_id
       WHERE a.status = 'active'
         AND a.end_date <= NOW() + INTERVAL '${daysAhead} days'
       ORDER BY a.end_date`,
      []
    );

    return result.rows;
  }

  async getLowAuthorizations(thresholdPercent: number): Promise<Authorization[]> {
    const result = await db.query(
      `SELECT a.*, c.first_name, c.last_name, p.name as payer_name
       FROM authorizations a
       JOIN clients c ON c.id = a.client_id
       JOIN payers p ON p.id = a.payer_id
       WHERE a.status = 'active'
         AND (a.used_units::float / a.authorized_units) * 100 >= $1
       ORDER BY (a.used_units::float / a.authorized_units) DESC`,
      [thresholdPercent]
    );

    return result.rows;
  }

  private daysUntil(date: Date): number {
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
}
```

## Revenue Forecasting (AI-Powered)

Predict future revenue based on current data:

```typescript
// verticals/billing-invoicing/src/services/revenue-forecast-service.ts
import Anthropic from '@anthropic-ai/sdk';

export interface RevenueForecast {
  period: string;
  projectedRevenue: number;
  confidence: number;
  factors: ForecastFactor[];
  risks: ForecastRisk[];
}

export class RevenueForecastService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async generateForecast(months: number): Promise<RevenueForecast[]> {
    // Gather historical data
    const historicalRevenue = await this.getHistoricalRevenue(12);
    const activeClients = await this.getActiveClientCount();
    const activeAuthorizations = await this.getActiveAuthorizations();
    const expiringAuthorizations = await this.getExpiringAuthorizations(90);
    const scheduledVisits = await this.getScheduledVisits(90);

    const prompt = `You are a healthcare billing analyst. Generate a revenue forecast.

Historical Monthly Revenue (last 12 months):
${historicalRevenue.map((r) => `${r.month}: $${r.revenue.toLocaleString()}`).join('\n')}

Current State:
- Active clients: ${activeClients}
- Active authorizations: ${activeAuthorizations.length}
- Authorizations expiring in 90 days: ${expiringAuthorizations.length}
- Visits scheduled next 90 days: ${scheduledVisits}

Generate a ${months}-month revenue forecast. For each month, provide:
1. Projected revenue (dollar amount)
2. Confidence level (0-100)
3. Key factors affecting the projection
4. Risks that could impact revenue

Return as JSON:
{
  "forecasts": [
    {
      "period": "2025-01",
      "projectedRevenue": 150000,
      "confidence": 85,
      "factors": ["steady client base", "seasonal increase"],
      "risks": ["3 authorizations expiring"]
    }
  ]
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse forecast response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.forecasts;
  }

  private async getHistoricalRevenue(months: number): Promise<{ month: string; revenue: number }[]> {
    const result = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', invoice_date), 'YYYY-MM') as month,
         SUM(amount_paid) as revenue
       FROM invoices
       WHERE invoice_date >= NOW() - INTERVAL '${months} months'
         AND status IN ('paid', 'partial')
       GROUP BY DATE_TRUNC('month', invoice_date)
       ORDER BY month`
    );

    return result.rows;
  }
}
```

## Billing Dashboard API

```typescript
// verticals/billing-invoicing/src/routes/billing-routes.ts
import { Router } from 'express';
import { billingService } from '../services/billing-service';
import { authorizationService } from '../services/authorization-service';

const router = Router();

// Dashboard summary
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const [
      outstandingTotal,
      overdueCount,
      recentPayments,
      expiringAuths,
      lowAuths,
    ] = await Promise.all([
      billingService.getOutstandingTotal(),
      billingService.getOverdueCount(),
      billingService.getRecentPayments(7),
      authorizationService.getExpiringAuthorizations(30),
      authorizationService.getLowAuthorizations(80),
    ]);

    res.json({
      outstandingTotal,
      overdueCount,
      recentPayments,
      alerts: {
        expiringAuthorizations: expiringAuths.length,
        lowAuthorizations: lowAuths.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Generate invoice
router.post('/invoices/generate', requireAuth, async (req, res, next) => {
  try {
    const { payerId, clientId, startDate, endDate } = req.body;

    const invoice = await billingService.generateInvoice(
      payerId,
      clientId,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

// Record payment
router.post('/invoices/:id/payments', requireAuth, async (req, res, next) => {
  try {
    const { amount, paymentMethod, referenceNumber } = req.body;

    const payment = await billingService.recordPayment(
      req.params.id,
      amount,
      paymentMethod,
      referenceNumber
    );

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

// Revenue forecast
router.post('/forecast', requireAuth, async (req, res, next) => {
  try {
    const { months } = req.body;
    const forecast = await revenueForecastService.generateForecast(months || 3);
    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

export { router as billingRoutes };
```

## Vibe Coding Billing

When building billing features with AI:

> "Create an invoice generation service that calculates billable hours from completed visits and applies payer-specific rates"

> "Build an authorization tracking system that alerts when authorizations are about to expire or run low"

> "Implement an AI-powered revenue forecast that analyzes historical billing and predicts future revenue"

> "Add payment recording with automatic invoice balance updates"

Healthcare billing has many edge cases. AI handles the complexity while you focus on business rules.

## Next Steps

With billing in place, we need to ensure everything is compliant. In the next chapter, we'll build compliance checking and reporting systems that keep agencies audit-ready.
