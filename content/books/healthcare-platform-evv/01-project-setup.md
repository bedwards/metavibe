# The Foundation Before the Features

Every decision in project setup reverberates through the entire codebase. Choose the wrong database structure and you'll fight it for months. Skip security considerations and you'll retrofit them painfully later. Healthcare software amplifies these stakes because the consequences of architectural mistakes affect patient care.

Traditional healthcare software development approached setup with extreme caution. Consultants spent weeks on requirements gathering. Architects debated schema designs. Security reviews blocked progress for months. This thoroughness had merit—healthcare data is sensitive—but it also meant projects took years to reach patients.

Vibe coding offers a different path. Not a reckless one—the sensitivity remains—but a path where architectural decisions can be made quickly, tested immediately, and revised if wrong. AI assistants know healthcare patterns. They can generate HIPAA-appropriate structures faster than humans can write requirements documents. The risk shifts from "did we plan enough" to "are we iterating on the right things."

The monorepo pattern suits healthcare platforms particularly well. A monorepo keeps all your code in one repository: the API server, the web application, the mobile app, shared libraries, database schemas. When you change a type definition, every package that uses that type sees the change immediately. When you update a security pattern, it propagates everywhere at once.

Healthcare platforms have natural divisions that map to packages within the monorepo. Core functionality—database access, authentication, types—lives in one shared package. The main API server orchestrates everything but delegates domain logic to specialized packages. Domain-specific features—care plans, scheduling, billing, compliance—each get their own package that depends on core but not on each other.

This separation matters because healthcare regulations treat different data types differently. Billing data has different retention requirements than clinical data. Compliance data needs different audit trails than scheduling data. Keeping these domains separate in code makes regulatory compliance more tractable.

TypeScript provides type safety that healthcare software particularly needs. A mismatched type in an e-commerce application might show the wrong price; a mismatched type in healthcare might administer the wrong medication dosage. TypeScript's compiler catches these errors before deployment, converting runtime crashes into build-time failures.

We configured TypeScript strictly for our healthcare project. Every variable must have a known type. Array access acknowledges that the element might not exist. Optional properties distinguish between "this field is missing" and "this field is explicitly set to nothing." These distinctions matter when you're dealing with medical records where missing data has different implications than zero values.

The database schema deserves careful thought because healthcare data has specific characteristics.

UUIDs work better than auto-incrementing integers for healthcare identifiers. Healthcare data frequently moves between systems—aggregators, clearinghouses, state registries. Auto-incrementing IDs collide during these integrations. UUIDs don't. The slight performance cost is worth the integration flexibility.

Separate tables for EVV records acknowledge that EVV has specific compliance requirements beyond normal visit tracking. A visit might be scheduled, completed, and paid without EVV. But EVV-required services need additional verification: location capture, signature collection, service type confirmation. A dedicated table for EVV compliance makes auditing straightforward—everything the state needs to verify lives in one place.

Audit logging must happen from day one, not as an afterthought. HIPAA requires knowing who accessed what protected information and when. An audit log table captures this systematically: user identity, action performed, entity affected, old and new values, timestamp, IP address. This logging feels verbose during development but proves invaluable during compliance reviews and incident investigations.

Geographic coordinates appear throughout healthcare schemas because location matters. EVV requires verifying that care was delivered at the patient's home, not somewhere else. This verification compares the caregiver's GPS coordinates at clock-in against the patient's known address. Storing latitude and longitude enables these distance calculations.

JSONB columns handle the semi-structured data that healthcare accumulates. Caregiver certifications vary by state, specialty, and agency. Rather than creating separate columns for every possible certification type, a JSONB column stores this flexible data. The same pattern works for aggregator responses, which vary by state EVV system.

Docker provides consistent development environments that mirror production. When every developer runs the same PostgreSQL version in the same configuration, "works on my machine" problems disappear. Docker Compose orchestrates multiple services—database, cache, application server—with a single command.

Security middleware belongs in the project setup, not sprinkled throughout later. Helmet configures security headers that prevent common web vulnerabilities. Rate limiting prevents abuse and denial-of-service attacks. These protections should apply to every endpoint automatically, not require developers to remember them for each new route.

The audit logging middleware intercepts every request that accesses protected information. When someone reads a patient record, the middleware logs that access. When someone updates a care plan, the middleware captures both the old and new values. This automatic logging ensures compliance without requiring developers to add logging calls to every function.

Environment configuration validates required settings at startup rather than failing mysteriously later. A healthcare application needs database credentials, authentication secrets, potentially API keys for aggregator integrations. Validating these requirements when the application starts—and failing clearly if they're missing—prevents the frustrating experience of discovering missing configuration during a critical operation.

When vibe coding project setup, we found that describing the overall architecture produced better results than requesting specific files. "Create a TypeScript monorepo for healthcare with separate packages for care plans, scheduling, billing, and compliance, with a shared core package for database and authentication" generates a coherent structure. Following up with specific requirements—"add HIPAA audit logging middleware" or "configure strict TypeScript settings"—refines that structure toward production readiness.

The setup phase is where AI assistance provides the most leverage. Generating boilerplate—package configurations, Docker files, TypeScript settings, database schemas—is exactly what AI excels at. These patterns exist in countless open-source projects; AI has seen them all. You can generate a production-quality project structure in minutes that would take days to write manually.

But setup is also where mistakes are most expensive to fix later. A database schema that doesn't support your actual workflows requires migrations and data transformations. A type system that doesn't model your domain forces constant workarounds. Security patterns that don't match regulations require auditing and retrofitting.

The technique we developed was iterative refinement of the foundation. Generate an initial structure. Build a simple feature on top of it. Notice what's awkward or missing. Refine the foundation. Repeat. This approach catches architectural problems while they're still cheap to fix, before the codebase grows around them.

Testing the foundation before building features prevents discovering problems after you've invested heavily in a flawed base. Can you run the database? Can you make authenticated API calls? Does the audit logging capture what you expect? These checks seem obvious but get skipped when teams are eager to start on "real" features.

The foundation work might feel like delay when you're eager to build healthcare features. But every hour invested in solid architecture saves days of debugging later. Healthcare software that works correctly matters more than healthcare software that ships quickly with hidden problems.

The next chapter introduces care plans—the core domain object around which everything else in a home healthcare platform revolves. The foundation we've built here supports that work: the database schema has care plan tables, the type system will define care plan types, the audit logging will track care plan access.

We're ready to build.
