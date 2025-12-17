# Architecture for a Personal Tool

The temptation when starting any software project is to over-engineer from the beginning. Years of industry experience teach developers to anticipate scale, plan for edge cases, design for extensibility. These instincts serve teams building products for millions of users. They actively harm solo developers building tools for themselves.

A personal reading library has exactly one user. That user knows what they want because they're the person building it. The architecture should reflect this reality: simple enough to understand completely, flexible enough to modify when needs change, robust enough to not break during daily use.

The stack that emerged from my vibe coding sessions was deliberately boring. Node.js for the backend because JavaScript runs everywhere and TypeScript provides enough type safety to catch obvious mistakes. PostgreSQL for the database because full-text search capabilities matter for a reading library and Postgres handles this natively. A simple Express server for the API because the ecosystem is mature and well-documented. Vite for the frontend because it's fast and gets out of the way.

No microservices. No message queues. No distributed caching. No container orchestration. Just a monolithic application that runs on a single machine and does one thing well.

The architecture follows a pattern that repeats across vibe-coded projects: layers that separate concerns without introducing unnecessary complexity. The database stores everything that needs to persist. The services layer contains the business logic—parsing feeds, extracting content, generating speech. The API layer exposes endpoints for the frontend. The frontend renders data and captures user input. Each layer has a clear responsibility, and changes in one layer rarely ripple into others.

The database design deserves particular attention because it shapes everything else. Content applications live and die by their data models. Get the schema right early and the rest flows naturally. Get it wrong and you'll spend more time fighting your data than working with it.

A reading library needs to track feeds you've subscribed to, articles from those feeds, tags for organization, reading lists for curation, and progress through each article. That's five core entities with a few junction tables for many-to-many relationships. The temptation to add more—user accounts, sharing features, social integrations—should be resisted. Every table you add is complexity you'll maintain forever. Start minimal.

The vibe coding technique that worked best for database design was describing the domain in plain English and asking Claude to generate a schema. Not starting from the schema itself, but from what the application needs to do. Store articles with their full content and plain text. Track which feed each article came from. Allow multiple tags per article. Remember where I stopped reading or listening. From descriptions like these, Claude generates SQL that captures the relationships correctly.

UUIDs for primary keys turned out to be worth the minor overhead. When building offline-capable applications, the ability to generate identifiers on the client matters. You can save an article locally, assign it an ID, and sync that ID to the server later without conflicts. Auto-incrementing integers require a round-trip to the database to get an ID, which breaks in offline scenarios.

Storing both HTML and plain text for article content feels redundant until you understand why. The HTML version gets rendered in the reader view, preserving formatting that aids comprehension. The plain text version feeds into search indexes and text-to-speech engines. Computing plain text from HTML on every request would work but adds latency where it's least wanted. Storage is cheap. Time is not.

TypeScript configuration affects how the entire project evolves. The strict flags that matter most are the ones that prevent subtle bugs: requiring explicit return types when inference fails, treating array access as potentially undefined, distinguishing between missing properties and properties that might be undefined. These settings slow you down slightly when writing code and save hours when debugging.

The project structure follows convention rather than inventing something new. Source code in a source directory, tests alongside the code they test, database migrations in order, shared types in a central location. Anyone familiar with Node.js projects can navigate this structure without documentation.

Development workflow matters for vibe coding. The feedback loop between making a change and seeing its effect should be as short as possible. Hot reloading for the frontend. Watch mode for the backend that restarts on file changes. A database running locally in Docker so you can tear it down and rebuild whenever the schema evolves.

The technique that accelerated development most was treating the initial setup as a vibe coding session itself. Rather than manually configuring each tool, describe the development environment you want: TypeScript with strict settings, Express with standard middleware, PostgreSQL with Docker, Vite for the frontend. Claude generates the configuration files, and you iterate until everything runs. The specific settings matter less than having working tooling quickly.

One pattern that emerged repeatedly was the value of placeholder implementations. When building the project structure, stub out the services and endpoints even before they do anything real. A feed service that returns an empty array. An article endpoint that returns a hardcoded object. These placeholders establish the shape of the system and let you build the frontend against something real. You can vibe code the actual implementations later, confident that they'll slot into place.

The architecture decision with the most long-term impact was choosing to store article content locally rather than fetching it on demand. Some read-it-later applications work by saving URLs and extracting content when you view them. This approach fails for content that changes or disappears. It fails when you're offline. It fails when the original site restructures. A personal reading library should be more like a personal library: once you've saved something, it belongs to you, independent of whether the source continues to exist.

Testing strategy for personal tools differs from testing strategy for production applications. You don't need comprehensive coverage of every edge case. You need confidence that the core workflows won't break when you make changes. For a reading library, that means testing that feeds parse correctly, articles extract successfully, and search returns expected results. The tests serve as documentation as much as verification—a record of how the system should behave.

The foundation establishes constraints that make future development easier. When you add RSS feed support, you know where the service goes and how the API exposes it. When you build the reader interface, you know what data it will receive. When you integrate text-to-speech, you know the text content is already extracted and waiting. Each feature builds on the foundation rather than fighting against it.

Getting the architecture right means getting it simple. Complexity can always be added when specific needs demand it. Starting complex means carrying weight that slows every subsequent step. A reading library for yourself needs to work reliably and be enjoyable to modify. Everything else is overhead.
