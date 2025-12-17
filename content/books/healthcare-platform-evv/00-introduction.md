# Introduction

Healthcare software touches lives. Every care plan, every scheduled visit, every verified clock-in represents real people receiving care they need. Building this software is meaningful work—and surprisingly accessible with modern AI-assisted development.

This book shows you how.

## Why Healthcare Software?

Home healthcare is a massive, growing industry:

- **Aging population** - More people need in-home care than ever before
- **Cost pressure** - Home care is cheaper than institutional care
- **Quality of life** - People prefer staying home to nursing facilities
- **Technology gap** - Most agencies still use paper, spreadsheets, or outdated software

The market opportunity is enormous. But more importantly, good software directly improves patient outcomes and caregiver experience.

## What is EVV?

Electronic Visit Verification (EVV) is mandated by the 21st Century Cures Act for Medicaid-funded personal care and home health services. It requires verifying:

1. **Type of service** - What care was provided
2. **Individual receiving service** - The patient identity
3. **Individual providing service** - The caregiver identity
4. **Date of service** - When the visit occurred
5. **Time in/out** - Start and end times
6. **Location** - Where the service was delivered

Non-compliance means no Medicaid reimbursement. Agencies need EVV—and many existing solutions are clunky, expensive, or both.

## Why Vibe Code It?

Healthcare software has traditionally required:

- Expensive consultants who understand healthcare regulations
- Long development cycles for compliance features
- Specialized domain knowledge that takes years to acquire

AI changes this equation:

- **Regulatory knowledge** - AI assistants know HIPAA, EVV requirements, healthcare billing codes
- **Boilerplate generation** - Compliance features are repetitive; AI handles them effortlessly
- **Domain translation** - Describe what you need in plain English, get working code
- **Rapid iteration** - Try ideas quickly, adjust based on real agency feedback

You don't need to become a healthcare expert before building healthcare software. You need to understand the *problems* agencies face. AI handles the implementation details.

## What We'll Build

By the end of this book, you'll have built:

- A complete care management system with care plans and tasks
- Caregiver scheduling with availability management
- AI-powered caregiver-patient matching
- Full EVV compliance (clock-in, clock-out, GPS, signatures)
- Billing and invoicing with payer integration
- Compliance checking and reporting
- AI features: natural language care plans, churn prediction, smart alerts

More importantly, you'll understand *why* these features exist and how they fit together.

## The Healthcare Software Stack

We'll use a modern TypeScript stack:

**Backend:**
- Node.js + Express for APIs
- PostgreSQL for relational data
- Redis for caching and real-time features
- TypeScript for type safety (critical in healthcare)

**Frontend:**
- React or Vue for web interfaces
- React Native for mobile (caregiver apps)

**Infrastructure:**
- Docker for local development
- Vercel or Kubernetes for deployment
- Neon or Supabase for managed PostgreSQL

**AI:**
- Claude API for natural language features
- Embeddings for semantic search
- Structured output for reliable data extraction

## HIPAA Considerations

Healthcare data is sensitive. From day one:

- **Encryption at rest** - Database encryption enabled
- **Encryption in transit** - HTTPS everywhere
- **Access controls** - Role-based permissions
- **Audit logging** - Track who accessed what
- **BAA compliance** - Use HIPAA-compliant cloud providers

We won't build a fully HIPAA-certified system (that requires audits and legal work), but we'll build with HIPAA principles so your foundation is solid.

## Who This Book Is For

- **Developers** who want to enter healthcare tech
- **Agency operators** who need custom software
- **Entrepreneurs** building healthcare startups
- **Consultants** helping agencies modernize

You should know TypeScript and be comfortable with REST APIs. Healthcare domain knowledge helps but isn't required—that's what vibe coding is for.

## How to Use This Book

Each chapter builds on the previous, but they're designed to be useful references on their own:

- **Building from scratch?** Read front-to-back
- **Adding EVV to existing software?** Jump to Chapter 4
- **Need AI features?** Chapter 7 stands alone
- **Figuring out billing?** Chapter 5 covers healthcare billing models

Code examples are production-realistic. We show patterns that scale, not toys that break at the first edge case.

## A Note on Compliance

Healthcare software operates under heavy regulation. This book teaches technical implementation, not legal compliance. Before deploying to production:

- Consult with healthcare compliance experts
- Get legal review of your data handling
- Consider SOC 2 or HITRUST certification
- Work with your state's EVV aggregator

Good software architecture makes compliance easier. We build that foundation.

Let's help people get better care.
