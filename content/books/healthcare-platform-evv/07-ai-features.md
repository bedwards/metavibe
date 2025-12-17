# AI-Powered Features

AI transforms healthcare software from record-keeping to intelligent assistance. This chapter covers building AI features that make agencies more effective—natural language care plans, churn prediction, smart recommendations, and intelligent alerts.

## Natural Language Care Plan Generation

Care coordinators spend hours creating care plans. AI can draft them from simple descriptions:

```typescript
// verticals/care-plans-tasks/src/services/natural-language-care-plan-service.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const CarePlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  goals: z.array(z.object({
    goalText: z.string(),
    targetDate: z.string().optional(),
    interventions: z.array(z.object({
      description: z.string(),
      frequency: z.string(),
      tasks: z.array(z.object({
        name: z.string(),
        description: z.string(),
        estimatedMinutes: z.number(),
        category: z.enum([
          'personal_care', 'medication', 'mobility',
          'nutrition', 'companionship', 'housekeeping', 'transportation'
        ]),
      })),
    })),
  })),
  authorizedHoursPerWeek: z.number(),
});

export type GeneratedCarePlan = z.infer<typeof CarePlanSchema>;

export interface NaturalLanguageCarePlanRequest {
  clientDescription: string;
  conditions: string[];
  currentChallenges: string;
  desiredOutcomes: string;
  authorizationConstraints?: {
    maxHoursPerWeek: number;
    allowedServices: string[];
  };
}

export class NaturalLanguageCarePlanService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async generateCarePlan(
    request: NaturalLanguageCarePlanRequest
  ): Promise<GeneratedCarePlan> {
    const systemPrompt = `You are an expert home healthcare care plan writer.
Create detailed, actionable care plans that:
- Address the client's specific conditions and challenges
- Include measurable, achievable goals
- Define concrete interventions with specific tasks
- Respect authorization constraints
- Follow home healthcare best practices

Return ONLY valid JSON matching this schema:
${JSON.stringify(CarePlanSchema.shape, null, 2)}`;

    const userPrompt = `Create a care plan for this client:

Client Description: ${request.clientDescription}

Medical Conditions: ${request.conditions.join(', ')}

Current Challenges: ${request.currentChallenges}

Desired Outcomes: ${request.desiredOutcomes}

${request.authorizationConstraints ? `
Authorization Constraints:
- Maximum ${request.authorizationConstraints.maxHoursPerWeek} hours per week
- Allowed services: ${request.authorizationConstraints.allowedServices.join(', ')}
` : ''}

Generate a comprehensive care plan with 2-4 goals, each with specific interventions and tasks.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse and validate response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return CarePlanSchema.parse(parsed);
  }

  async refineCarePlan(
    existingPlan: GeneratedCarePlan,
    feedback: string
  ): Promise<GeneratedCarePlan> {
    const prompt = `Here's an existing care plan:
${JSON.stringify(existingPlan, null, 2)}

The care coordinator has this feedback: "${feedback}"

Please revise the care plan to address this feedback. Return the complete updated care plan as JSON.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response');
    }

    return CarePlanSchema.parse(JSON.parse(jsonMatch[0]));
  }
}
```

## Client Churn Prediction

Predict which clients might discontinue service:

```typescript
// verticals/analytics-reporting/src/services/churn-prediction-service.ts
import Anthropic from '@anthropic-ai/sdk';

export interface ChurnPrediction {
  clientId: string;
  clientName: string;
  churnRisk: 'high' | 'medium' | 'low';
  riskScore: number;
  riskFactors: string[];
  recommendations: string[];
  predictedTimeframe?: string;
}

export class ChurnPredictionService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async predictChurnRisk(clientId: string): Promise<ChurnPrediction> {
    // Gather client data
    const [
      client,
      visits,
      complaints,
      caregiverChanges,
      missedVisits,
      billingIssues,
    ] = await Promise.all([
      this.getClient(clientId),
      this.getRecentVisits(clientId, 90),
      this.getComplaints(clientId, 180),
      this.getCaregiverChanges(clientId, 90),
      this.getMissedVisits(clientId, 90),
      this.getBillingIssues(clientId),
    ]);

    // Calculate metrics
    const metrics = {
      visitConsistency: this.calculateVisitConsistency(visits),
      caregiverStability: caregiverChanges.length,
      missedVisitRate: missedVisits.length / (visits.length + missedVisits.length),
      complaintCount: complaints.length,
      hasBillingIssues: billingIssues.length > 0,
      daysSinceLastVisit: this.daysSince(visits[0]?.date),
      totalActiveMonths: this.monthsSince(client.startDate),
    };

    const prompt = `Analyze this home healthcare client for churn risk.

Client: ${client.firstName} ${client.lastName}
Active since: ${client.startDate}
Conditions: ${client.conditions?.join(', ') || 'Not specified'}

Recent Metrics (90 days):
- Visit consistency: ${(metrics.visitConsistency * 100).toFixed(1)}%
- Caregiver changes: ${metrics.caregiverStability}
- Missed visit rate: ${(metrics.missedVisitRate * 100).toFixed(1)}%
- Complaints filed: ${metrics.complaintCount}
- Days since last visit: ${metrics.daysSinceLastVisit}
- Has billing issues: ${metrics.hasBillingIssues}

Based on this data:
1. Assess churn risk (high/medium/low)
2. Provide a risk score (0-100)
3. List specific risk factors
4. Recommend retention actions

Return JSON:
{
  "churnRisk": "high|medium|low",
  "riskScore": 0-100,
  "riskFactors": ["factor1", "factor2"],
  "recommendations": ["action1", "action2"],
  "predictedTimeframe": "optional - e.g., '30 days'"
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse response');
    }

    const prediction = JSON.parse(jsonMatch[0]);

    return {
      clientId,
      clientName: `${client.firstName} ${client.lastName}`,
      ...prediction,
    };
  }

  async getHighRiskClients(limit = 20): Promise<ChurnPrediction[]> {
    // Get all active clients
    const clients = await this.getActiveClients();

    // Score each client
    const predictions: ChurnPrediction[] = [];

    for (const client of clients.slice(0, limit * 2)) {
      const prediction = await this.predictChurnRisk(client.id);
      predictions.push(prediction);
    }

    // Sort by risk score and return top N
    return predictions
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }

  private calculateVisitConsistency(visits: Visit[]): number {
    if (visits.length === 0) return 0;

    const completedVisits = visits.filter((v) => v.status === 'completed');
    return completedVisits.length / visits.length;
  }

  private daysSince(date?: Date): number {
    if (!date) return 999;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }

  private monthsSince(date: Date): number {
    const months = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.floor(months);
  }
}
```

## Smart Alerts

Proactive alerts that surface important information:

```typescript
// verticals/analytics-reporting/src/services/smart-alert-service.ts
import Anthropic from '@anthropic-ai/sdk';

export interface SmartAlert {
  id: string;
  type: AlertType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  context: Record<string, unknown>;
  suggestedActions: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export type AlertType =
  | 'certification_expiring'
  | 'authorization_low'
  | 'visit_pattern_change'
  | 'caregiver_burnout_risk'
  | 'client_health_decline'
  | 'scheduling_conflict'
  | 'billing_anomaly'
  | 'compliance_risk';

export class SmartAlertService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async generateDailyAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = [];

    // Check various conditions
    const checks = await Promise.all([
      this.checkCertificationExpirations(),
      this.checkAuthorizationLevels(),
      this.checkVisitPatterns(),
      this.checkCaregiverWorkload(),
      this.checkClientHealthIndicators(),
      this.checkBillingAnomalies(),
    ]);

    for (const checkAlerts of checks) {
      alerts.push(...checkAlerts);
    }

    return alerts;
  }

  private async checkCaregiverWorkload(): Promise<SmartAlert[]> {
    // Get caregivers with high workload
    const result = await db.query(
      `SELECT cg.id, cg.first_name, cg.last_name,
              COUNT(v.id) as visits_this_week,
              SUM(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) / 3600) as hours_this_week
       FROM caregivers cg
       JOIN visits v ON v.caregiver_id = cg.id
       WHERE v.status = 'completed'
         AND v.actual_start >= DATE_TRUNC('week', NOW())
       GROUP BY cg.id
       HAVING SUM(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) / 3600) > 35`
    );

    const alerts: SmartAlert[] = [];

    for (const row of result.rows) {
      const prompt = `A caregiver has worked ${row.hours_this_week.toFixed(1)} hours this week across ${row.visits_this_week} visits.

Assess burnout risk and provide:
1. Risk level (critical/warning/info)
2. Specific risk factors
3. Recommended actions

Return JSON:
{
  "severity": "critical|warning|info",
  "riskFactors": ["factor1"],
  "recommendations": ["action1"]
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);

          alerts.push({
            id: `burnout-${row.id}-${Date.now()}`,
            type: 'caregiver_burnout_risk',
            severity: analysis.severity,
            title: `Potential Burnout Risk: ${row.first_name} ${row.last_name}`,
            description: `${row.hours_this_week.toFixed(1)} hours worked this week`,
            context: {
              caregiverId: row.id,
              hoursWorked: row.hours_this_week,
              visitCount: row.visits_this_week,
              riskFactors: analysis.riskFactors,
            },
            suggestedActions: analysis.recommendations,
            createdAt: new Date(),
          });
        }
      }
    }

    return alerts;
  }

  private async checkClientHealthIndicators(): Promise<SmartAlert[]> {
    // Analyze visit notes for health concerns
    const result = await db.query(
      `SELECT v.id, v.client_id, v.notes,
              c.first_name, c.last_name
       FROM visits v
       JOIN clients c ON c.id = v.client_id
       WHERE v.status = 'completed'
         AND v.notes IS NOT NULL
         AND v.actual_start >= NOW() - INTERVAL '7 days'
       ORDER BY v.actual_start DESC`
    );

    const clientNotes = new Map<string, { client: string; notes: string[] }>();

    for (const row of result.rows) {
      const existing = clientNotes.get(row.client_id) || {
        client: `${row.first_name} ${row.last_name}`,
        notes: [],
      };
      existing.notes.push(row.notes);
      clientNotes.set(row.client_id, existing);
    }

    const alerts: SmartAlert[] = [];

    for (const [clientId, data] of clientNotes) {
      if (data.notes.length < 2) continue;

      const prompt = `Analyze these recent visit notes for a home healthcare client. Look for signs of health decline, concerning patterns, or issues requiring attention.

Recent visit notes (newest first):
${data.notes.slice(0, 5).map((n, i) => `Visit ${i + 1}: ${n}`).join('\n\n')}

If you identify concerning patterns, return JSON:
{
  "concernFound": true,
  "severity": "critical|warning|info",
  "concern": "brief description",
  "details": "detailed analysis",
  "recommendations": ["action1", "action2"]
}

If no concerns, return:
{
  "concernFound": false
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);

          if (analysis.concernFound) {
            alerts.push({
              id: `health-${clientId}-${Date.now()}`,
              type: 'client_health_decline',
              severity: analysis.severity,
              title: `Health Concern: ${data.client}`,
              description: analysis.concern,
              context: {
                clientId,
                analysis: analysis.details,
              },
              suggestedActions: analysis.recommendations,
              createdAt: new Date(),
            });
          }
        }
      }
    }

    return alerts;
  }

  // Additional check methods...
  private async checkCertificationExpirations(): Promise<SmartAlert[]> {
    return [];
  }

  private async checkAuthorizationLevels(): Promise<SmartAlert[]> {
    return [];
  }

  private async checkVisitPatterns(): Promise<SmartAlert[]> {
    return [];
  }

  private async checkBillingAnomalies(): Promise<SmartAlert[]> {
    return [];
  }
}
```

## AI-Powered Search

Let users query data naturally:

```typescript
// packages/core/src/ai/natural-language-query-service.ts
import Anthropic from '@anthropic-ai/sdk';

export class NaturalLanguageQueryService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async query(naturalLanguageQuery: string): Promise<QueryResult> {
    // First, determine what type of query this is
    const classificationPrompt = `Classify this healthcare query:
"${naturalLanguageQuery}"

Categories:
- client_lookup: Finding specific clients
- caregiver_lookup: Finding caregivers
- visit_search: Searching visits
- billing_query: Billing/invoice questions
- schedule_query: Scheduling questions
- compliance_query: Compliance/regulatory questions
- analytics: Statistical questions

Return JSON: { "category": "...", "entities": [...], "filters": {...} }`;

    const classResponse = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: classificationPrompt }],
    });

    const classContent = classResponse.content[0];
    if (classContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const classification = JSON.parse(
      classContent.text.match(/\{[\s\S]*\}/)?.[0] || '{}'
    );

    // Generate SQL based on classification
    const sql = await this.generateSQL(classification, naturalLanguageQuery);

    // Execute query (with safety checks)
    const results = await this.executeQuery(sql);

    // Generate human-readable summary
    const summary = await this.summarizeResults(
      naturalLanguageQuery,
      results
    );

    return {
      query: naturalLanguageQuery,
      classification,
      sql,
      results,
      summary,
    };
  }

  private async generateSQL(
    classification: QueryClassification,
    originalQuery: string
  ): Promise<string> {
    const schemaContext = `
Tables:
- clients (id, first_name, last_name, status, conditions, city, state)
- caregivers (id, first_name, last_name, status, certifications, hourly_rate)
- visits (id, client_id, caregiver_id, scheduled_start, scheduled_end, status, actual_start, actual_end)
- care_plans (id, client_id, name, status, authorized_hours_per_week)
- invoices (id, client_id, payer_id, total, status, invoice_date)
`;

    const prompt = `Generate a safe, read-only PostgreSQL query for:
"${originalQuery}"

Schema:
${schemaContext}

Requirements:
- SELECT only (no INSERT, UPDATE, DELETE)
- Include LIMIT 100 for safety
- Use proper JOINs for related data
- Return practical columns for display

Return only the SQL query, no explanation.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract SQL from response
    const sqlMatch = content.text.match(/```sql\n?([\s\S]*?)```/);
    return sqlMatch ? sqlMatch[1].trim() : content.text.trim();
  }

  private async executeQuery(sql: string): Promise<unknown[]> {
    // Safety check - only allow SELECT
    if (!sql.trim().toLowerCase().startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Additional safety: no semicolons (prevent multiple statements)
    if (sql.includes(';')) {
      throw new Error('Multiple statements not allowed');
    }

    const result = await db.query(sql);
    return result.rows;
  }

  private async summarizeResults(
    query: string,
    results: unknown[]
  ): Promise<string> {
    if (results.length === 0) {
      return 'No results found matching your query.';
    }

    const prompt = `Summarize these query results in 1-2 sentences:

User asked: "${query}"

Results (${results.length} rows):
${JSON.stringify(results.slice(0, 10), null, 2)}
${results.length > 10 ? `\n... and ${results.length - 10} more rows` : ''}

Provide a helpful, concise summary.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : 'Results retrieved successfully.';
  }
}
```

## Vibe Coding AI Features

When building AI features with AI:

> "Create a natural language care plan generator that takes a client description and outputs structured goals, interventions, and tasks"

> "Build a client churn prediction service that analyzes visit patterns, complaints, and caregiver changes"

> "Implement smart alerts that analyze visit notes for signs of client health decline"

> "Add natural language querying that converts questions like 'show me all clients in Phoenix with missed visits' into SQL"

AI building AI features—it understands what you're trying to accomplish and generates robust implementations.

## Final Thoughts

You've built a complete healthcare platform:

- **Care Plans** - Structured care with goals and tasks
- **Caregiver Management** - Profiles, credentials, matching
- **EVV Compliance** - Clock-in/out with GPS and signatures
- **Billing** - Invoices, payments, authorizations
- **Compliance** - Automated checking and audit trails
- **AI Features** - Natural language, predictions, alerts

More importantly, you've learned the *patterns*. Healthcare software follows specific rules—understanding them lets you adapt these solutions to any agency's needs.

The healthcare industry needs better software. Now you can build it.
