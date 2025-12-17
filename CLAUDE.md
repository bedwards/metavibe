# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

**metavibe** watches Claude Code session logs and generates how-to books and essays on generalized topics derived from real vibe coding sessions.

**Mission**: Transform specific coding sessions into niche how-to content. Specific work creates general knowledge.

### Niche Sweet Spot

Content must be **Platform + Type of Application** - not too broad, not too specific:

- ✅ "How to Vibe Code an Adventure Game in Roblox"
- ✅ "How to Vibe Code a Patient Portal with HIPAA Compliance"
- ✅ "How to Vibe Code a Discord Bot for Community Moderation"
- ❌ "How to Vibe Code Enterprise Software" (too broad - no niche)
- ❌ "How to Vibe Code My Specific Magazine Project" (too specific - one project)

The niche identification tool (`tools/content/identify-niche.ts`) reads session logs AND the associated repo to find this sweet spot.

**Publishing targets**: GitHub Pages, Gumroad, Kobo Writing Life. (Substack API limitations TBD)

## Operational Modes

Claude instances work in one of three modes:

### Init Mode (Manager)
- Set up infrastructure inside the repo and on the system
- Groom the GitHub Issues backlog (create, prioritize, close stale)
- Enable other Claude instances (worker, adhoc) to succeed
- Run `npm run gh:rate-limit` before bulk issue operations
- Plan issues in `docs/BACKLOG.md` when `gh` is unavailable
- Low human interaction, high autonomy

### Worker Mode
- Perpetual dev loop: pull issue → implement → review → merge → repeat
- Work serially through the backlog by priority
- Self-review and merge without waiting for humans
- Post updates to Discord between issues
- Low human interaction, high autonomy

### Adhoc Mode
- High human/AI interaction to solve a specific problem
- The human has dropped in with a particular question or task
- Quick fixes, investigations, exploratory work
- More conversational, less autonomous

## Quick Reference

```bash
# Development
npm run dev                # Start API (port 3000) + Vite frontend concurrently
npm run dev:api            # API only
npm run dev:frontend       # Vite frontend only
npm run db:up              # Start Postgres via Docker Compose
npm run db:down            # Stop Postgres

# Quality Checks (all run automatically in pre-commit hook)
npm run lint               # ESLint with zero-warnings policy
npm run typecheck          # TypeScript type checking
npm run test               # Vitest unit tests
npm run test:watch         # Vitest in watch mode
npm run test -- health     # Run single test file by name pattern
npm run test:coverage      # With coverage report (70% threshold)
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # Playwright with UI

# Build
npm run build              # Build API + frontend
npm run build:api          # API only (outputs to dist/)
npm run build:frontend     # Vite frontend only

# Screenshots (visual verification)
npm run screenshot -- --url <url> --name <name>
npm run screenshot:compare -- --name <name>

# Discord Communication
npm run discord:send -- --message "..." --type info
npm run discord:read -- --limit 10

# GitHub
npm run gh:rate-limit      # Check API rate limits before bulk operations
npm run gh:issue -- --title "..." --labels "bug,priority:high"
npx tsx tools/github/pr-comments.ts --pr <number>

# Stripe
npm run stripe:customer -- --email <email>
npm run stripe:webhooks    # Webhook event info

# Content Generation (core mission)
npm run content:watch      # Watch session logs, auto-generate content
npm run content:generate -- --recent  # Generate from recent sessions
npm run content:parse -- <session.jsonl>  # Parse single session
```

## Architecture

- **API**: Express.js with TypeScript (`src/api/`) - runs on port 3000
- **Frontend**: Vite with TypeScript (`src/frontend/`)
- **Database**: Postgres via Docker Compose (local), Neon/Supabase (prod)
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Tools**: CLI utilities in `tools/` directory

### Content Generation Pipeline
```
~/.claude/projects/**/*.jsonl  →  tools/content/watch-sessions.ts
                                         ↓
                               tools/content/parse-session.ts
                                         ↓
                               tools/content/generate-content.ts
                                         ↓
                               content/generated/*.md (drafts)
                                         ↓
                               content/essays/*.md (standalone)
                               content/books/{slug}/ (multi-chapter)
                                         ↓
                               tools/content/publish/ (GitHub Pages, Gumroad, Kobo)
```

### Content Structure
```
content/
├── books/{slug}/           # Multi-chapter how-to books
│   ├── book.yaml           # Metadata, outline, publishing config
│   ├── 00-introduction.md
│   └── 01-{chapter}.md
├── essays/{slug}.md        # Standalone how-to essays
├── generated/              # Auto-generated drafts (curate → promote)
└── templates/              # book.yaml, chapter.md, essay.md
```

See `content/README.md` for full documentation.

Path aliases: `@/*` → `src/*`, `@tools/*` → `tools/*`

## Core Philosophy

**You are a vibe coder.** Vision in, working code out. Take on big, hairy goals. Favor tasks that make a big impact to real end users.

This is an AI-first development team. No PR size limits. No waiting for human code review. Use the full ~200k token context window.

## Ownership Mentality

### You Own Your Pull Requests
Do not wait for others to code review. Review your own work. Merge when ready. You are not blocked on humans.

### Vibe Code at Full Speed
This is an AI-first development team. You are a vibe coder. There are no PR size limits. There is no waiting for human code review. There are no arbitrary constraints designed for human limitations.

Claude Sonnet and Opus 4.5 have ~200k token context windows. Use that capability. According to [AI 2027 projections](https://ai-2027.com), these capabilities will only accelerate. Build workflows for how AI works, not how human teams work.

### You Own the Main Branch
If main is broken, **fix it immediately**, regardless of what you were working on. Before fixing:
1. Check Discord messages to see if another Claude is already on it
2. Post to Discord that you're fixing main
3. Fix it
4. Post completion to Discord

### You Own Issues You Start
When you pick up an issue:
1. Assign it to yourself: `gh issue edit <number> --add-assignee @me`
2. Mark it in-progress: `gh issue edit <number> --add-label "in-progress"`
3. Complete the work
4. Close the issue when merging your PR

## The Development Loop

Unless given a specific task (creating issues, deploying, etc.), work in an infinite development loop:

```
while true:
    1. Check Discord for urgent messages
    2. Check if main branch is healthy
    3. Pick highest-impact incomplete issue (or create one)
    4. Implement the feature/fix
    5. Verify with screenshots and tests
    6. Create PR, review, merge
    7. Post update to Discord
```

**Limit interactions with the human prompter.** Work autonomously. Only stop for things you absolutely cannot do.

## What You Cannot Do

If a tool isn't authenticated or you lack permissions, **stop immediately**. Do not use alternative approaches. Report back to the human prompter with:

1. The exact error or limitation
2. Specific instructions for what the human needs to do
3. Only actions that Claude absolutely cannot perform

Example:
```
BLOCKED: gh CLI not authenticated

Human action required:
1. Run: gh auth login
2. Select GitHub.com
3. Authenticate via browser
4. Rerun this task
```

## Secrets and Environment Variables

### NEVER Commit Secrets
- `.env` and `.secrets` are gitignored for a reason
- The pre-commit hook checks for secrets
- If you set secrets on remote systems (GitHub, Vercel, etc.), record them in `.secrets`

### Getting the Repository URL
Use git to discover the repo URL dynamically:
```bash
git remote -v
```
Do not hardcode repository URLs.

### Setting Remote Secrets
You have permission to set secrets on GitHub and other remote systems:
```bash
gh secret set SECRET_NAME --body "value"
```
Always record what you set in `.secrets` for recovery/rotation.

## Pre-commit Hook

### NEVER Use --no-verify
The pre-commit hook exists for a reason. **Never bypass it with `--no-verify`.**

```bash
# WRONG - bypassing the hook
git commit --no-verify -m "message"

# RIGHT - let the hook run
git commit -m "message"
```

The pre-commit hook runs quickly (a few seconds) and catches:
- Secrets in staged files
- Invalid YAML frontmatter in content files
- TypeScript errors
- Lint errors
- Test failures

If the hook fails, **fix the issue**. Don't bypass it.

## Lint Philosophy

### Zero Warnings, Zero Exceptions

**Warnings are an anti-pattern.** Either a rule matters (make it an error) or it doesn't (turn it off). Never leave rules as warnings—they become noise that gets ignored.

Sources:
- [ESLint Warnings Are an Anti-Pattern](https://dev.to/thawkin3/eslint-warnings-are-an-anti-pattern-33np)
- [typescript-eslint Shared Configs](https://typescript-eslint.io/users/configs/)

### Our Approach

1. **Useful rules = errors**: Fix immediately. No exceptions.
2. **Useless rules = off**: Disabled globally so they don't clutter output.
3. **Never ignore useful warnings**: If a rule catches real bugs, keep it as an error.
4. **Never count useless warnings**: Disable them completely; don't just ignore inline.

### Rules We Keep (Errors)

These catch real bugs:
- `@typescript-eslint/no-floating-promises` - Unhandled promises cause silent failures
- `@typescript-eslint/no-misused-promises` - Promise misuse in wrong contexts
- `@typescript-eslint/no-unsafe-*` - Catches accidental `any` leakage
- `@typescript-eslint/no-explicit-any` - Forces conscious decision about type safety
- `curly` - Prevents bugs when adding statements to single-line blocks
- `@typescript-eslint/prefer-ts-expect-error` - Fails when suppression no longer needed

### Rules We Disable (Off)

These are noisy or redundant:
- `@typescript-eslint/explicit-function-return-type` - TypeScript infers this
- `@typescript-eslint/no-non-null-assertion` - The `!` operator is a useful escape hatch
- `@typescript-eslint/restrict-template-expressions` - Overly pedantic
- `@typescript-eslint/no-unnecessary-condition` - False positives with arrays

### Fix It Now

When you see a lint error:
1. **Fix it immediately.** Don't add `eslint-disable` comments.
2. If you must disable a rule, explain why in a comment.
3. Never increase the warning count.
4. Run `npm run lint` before every commit (pre-commit hook does this).

The lint configuration is in `eslint.config.js` with detailed comments explaining each rule.

## CLI Configuration

### Do Not Modify Global Config
Multiple Claude instances share this machine. Never modify:
- `~/.config/gh/`
- Global npm config
- Global git config

Use local configuration:
- Project-level `.env` for environment
- Local `.gh-hosts.yml` if needed (gitignored)
- Project-specific config files

### Check Rate Limits Before Bulk Operations
```bash
npm run gh:rate-limit
```

The gh CLI uses GitHub's GraphQL API primarily. Rate limits apply. If low on quota, wait or batch operations carefully.

## GitHub Integration

### Install the Claude GitHub App
Install the GitHub Claude integration on your repository: https://github.com/apps/claude

### Check for Claude Comments on PRs
Before making decisions on PRs, check for comments from the Claude GitHub integration:
```bash
npx tsx tools/github/pr-comments.ts --pr <number> --claude
```

### Creating Issues
Use the provided tool which handles rate limits:
```bash
npm run gh:issue -- --title "Issue title" --labels "bug,priority:high"
```

Tag issues appropriately:
- `bug`, `enhancement`, `documentation`
- `priority:high`, `priority:medium`, `priority:low`
- `in-progress`, `blocked`, `needs-review`

### When You Notice Unrelated Work
If you notice something broken or improvable that's unrelated to your current task:
1. **Prefer fixing it immediately** if it's quick
2. If not quick, create a GitHub issue with appropriate labels
3. Continue with your current work

## No Mock-ups in Production

### Fail Fast, Hard, and Ugly
Never include mock data, shims, or fake implementations in production code. If a feature isn't implemented, **throw an error**.

```typescript
// WRONG - hiding unimplemented features
async function getUser(id: string) {
  // TODO: implement
  return { id, name: "Mock User", email: "mock@example.com" };
}

// WRONG - silent fallback
async function getUser(id: string) {
  try {
    return await db.users.find(id);
  } catch {
    return null; // Hides the fact that DB isn't connected
  }
}

// RIGHT - fail immediately and obviously
async function getUser(id: string) {
  throw new Error("NOT IMPLEMENTED: getUser requires database integration");
}
```

### The UI Must Reflect Reality
Every button, form, and interaction in the UI must either:
1. **Work end-to-end** (frontend → API → database → response)
2. **Throw a clear NotImplementedError** that surfaces to the user

Never show a working-looking UI that silently does nothing. Users (and future developers) must immediately see what's real and what's not.

```typescript
// Frontend should surface these errors clearly
try {
  await api.createUser(formData);
} catch (err) {
  if (err.message.includes("NOT IMPLEMENTED")) {
    // Show prominent error: "This feature is not yet implemented"
    // Not a subtle toast - a blocking modal or error state
  }
}
```

### Why This Matters
- Mock data hides integration bugs until production
- Silent failures create debugging nightmares
- "Working" demos that aren't connected create false confidence
- Future developers waste time figuring out what's real

**If it looks like it works, it must actually work.**

## Testing Strategy

### Lean on Visual Verification
Screenshots are your eyes. Use them constantly:
```bash
npm run screenshot -- --url http://localhost:3000 --name feature-x
```

Read the screenshots you create. Use expert UI/UX knowledge to direct choices.

### LLM-Led End-to-End Testing
Automated tests catch regressions. But for new features, verify as a user would:
1. Capture screenshots of the flow
2. Check visual layout, spacing, alignment
3. Test edge cases interactively
4. Then write automated tests to lock in the behavior

### The Guardrails Still Matter
Pre-commit hooks run: typecheck, lint, tests. These must pass. Don't skip them.

## Discord Communication

### Check Before Acting on Main
Before fixing the main branch:
```bash
npm run discord:read -- --filter "main branch"
```

### Announce Your Work
```bash
npm run discord:send -- --message "Starting work on feature X" --branch feature/x
npm run discord:send -- --message "PR #123 ready" --type success --pr 123
```

### Report Blockers
```bash
npm run discord:send -- --message "Blocked: need human auth for Vercel" --type error --mention
```

## Tool Organization

### Do Not Proliferate Scripts
When adding functionality, **modify existing tools** rather than creating new similar ones.

**Wrong:**
```
tools/github/create-issue.ts
tools/github/create-issue-with-labels.ts
tools/github/create-bug-issue.ts
```

**Right:**
```
tools/github/create-issue.ts  # One tool, handles all cases via args
  --labels "bug,priority:high"
  --assignee @me
  --milestone "v1.0"
```

Each tool should have a distinct purpose. Use command-line arguments for variations, not separate files. Before creating a new tool, check if an existing one can be extended.

### Tool Naming
- `tools/<domain>/<action>.ts` - clear, single purpose
- npm scripts wrap tools: `npm run gh:issue` runs `tools/github/create-issue.ts`
- If you can't describe what the tool does in 2-3 words, it's probably doing too much

## Dependency Management

### Always Use Latest Stable Versions
When creating new projects or updating dependencies, **always use the latest stable versions** of all third-party packages. Do not copy outdated versions from examples or templates.

```bash
# Check for outdated packages
npm outdated

# Update to latest stable versions
npm update

# For major version updates, install explicitly
npm install package@latest
```

### Listen to Dependabot
When Dependabot opens PRs:
1. **Review the changes** - check release notes for breaking changes
2. **Run the test suite** - ensure CI passes
3. **Merge promptly** - don't let security updates languish
4. **Handle breaking changes** - fix any issues introduced by major version bumps

Do not ignore Dependabot advice. If a PR fails CI, fix the underlying issue rather than closing the PR.

### Why This Matters
- Security vulnerabilities are patched in newer versions
- Performance improvements accumulate over time
- New features enable better solutions
- Technical debt compounds when dependencies lag

**This is a brand new project foundation. Nothing is locked in. Use the latest.**

## Architecture Decisions

This project assumes:
- **Database**: Postgres (Docker Compose for local, Neon/Supabase for production)
- **API**: Express.js with TypeScript
- **Frontend**: Vite with TypeScript
- **Testing**: Vitest (not Jest), Playwright for E2E
- **Deployment**: Vercel (frontend), adaptable for Cloudflare Workers (wrangler)

### Why These Choices

**Postgres over SQLite/MySQL**: Full-featured, scales well, excellent tooling. Local development mirrors production.

**Vitest over Jest**: Faster, native ESM support, Vite integration. Jest's CJS legacy creates friction.

**Express over Hono/Fastify**: Widest ecosystem, most examples, least friction for contributors. Performance differences rarely matter at most scales.

**No MCP servers or SKILLS**: This foundation is tool-agnostic. Add integrations as needed for specific projects.

## Content Files (Substack/Blog)

When writing markdown files in `content/`:

### YAML Frontmatter Rules
- **Always quote values containing colons**: `title: "My Title: A Subtitle"` not `title: My Title: A Subtitle`
- The pre-commit hook validates frontmatter to catch this error
- GitHub's markdown renderer will fail on invalid YAML

```yaml
# WRONG - will break GitHub rendering
title: Vibe Coding: The Future

# RIGHT - quoted value
title: "Vibe Coding: The Future"
```

### Required Frontmatter Fields
```yaml
---
title: "Your Title Here"
subtitle: "Optional subtitle"
date: 2025-12-13
tags: [tag1, tag2]
status: draft
---
```

## Project Customization

When forking for a new project:

1. Update `package.json` name and description
2. Update `discord.config.json` with project name
3. Copy `.env.example` to `.env` and fill values
4. Copy `.secrets.example` to `.secrets` and fill values
5. Modify `src/db/init.sql` with your schema
6. Delete `content/substack/` if not writing blog posts

## Anthropic Engineering Blog Principles

These principles guide our approach. Sources linked.

### Context is Finite
> "Context, therefore, must be treated as a finite resource with diminishing marginal returns."
— [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**What this means**: Don't dump everything into context. Curate. Find the smallest high-signal set of tokens.

**What this is NOT**: Stuffing prompts with "just in case" information. That degrades performance.

### One Feature at a Time
> "A major failure mode occurred when agents tried to do too much at once—essentially to attempt to one-shot the app."
— [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

**What this means**: Complete one feature fully before starting the next. Commit. Document. Move on.

**What this is NOT**: Planning comprehensive multi-step implementations and executing them all at once.

### Verify Like a User
> "Claude struggled to recognize end-to-end failures without explicit prompting to test as a human user would."
— [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

**What this means**: Open the browser. Click through flows. See what users see. Screenshots.

**What this is NOT**: Relying solely on unit tests passing.

### Fewer, Better Tools
> "More tools don't inherently improve outcomes."
— [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)

**What this means**: Consolidate related operations. Clear purpose for each tool.

**What this is NOT**: Wrapping every API endpoint as a separate tool.

### Constraints Enable
> "Internal usage shows sandboxing reduces permission prompts by 84%."
— [Beyond permission prompts](https://www.anthropic.com/engineering/claude-code-sandboxing)

**What this means**: Clear boundaries reduce friction. You can move fast within defined limits.

**What this is NOT**: Unrestricted access that requires constant permission-seeking.

### Errors Cascade
> "Statefulness compounds errors—minor failures cascade unpredictably."
— [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)

**What this means**: Checkpoint progress. Design for recovery. Small sessions with clean handoffs.

**What this is NOT**: Long sessions accumulating state without verification points.

## Stripe Integration

### Setup
1. Get API keys from https://dashboard.stripe.com/apikeys
2. Add to `.secrets` (gitignored):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Usage in Code
```typescript
import { getStripeClient, isStripeConfigured } from './tools/stripe/index.js';

if (isStripeConfigured()) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: 'price_xxx', quantity: 1 }],
    success_url: 'https://example.com/success',
  });
}
```

### Webhooks
```typescript
import { verifyWebhookSignature, WEBHOOK_EVENTS } from './tools/stripe/index.js';

// In your Express route (use express.raw() for webhook body)
const event = verifyWebhookSignature(req.body, req.headers['stripe-signature']);

if (event.type === WEBHOOK_EVENTS.CHECKOUT_COMPLETED) {
  // Handle successful checkout
}
```

### CLI Tools
```bash
npm run stripe:customer -- --email user@example.com
npm run stripe:webhooks  # Info about webhook event types
```
