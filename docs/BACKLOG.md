# Backlog

Issues to create once `gh auth login` is complete.

## Priority: High

### 1. GitHub Pages Deployment Pipeline
**Labels**: `enhancement`, `priority:high`

Set up GitHub Pages deployment for publishing generated content.
- Create GitHub Actions workflow for building content to static site
- Configure custom domain (if desired)
- Set up content index/homepage
- Integrate with content generation pipeline

### 2. Improve Niche Identification Accuracy
**Labels**: `enhancement`, `priority:high`

The niche identifier sometimes misidentifies projects (e.g., healthcare app identified as "Game" due to test data patterns).
- Add negative pattern matching (exclude false positives)
- Weight patterns by file location (package.json > random files)
- Add confidence thresholds for different pattern types
- Test against known project types

### 3. Gumroad Publisher Integration
**Labels**: `enhancement`, `priority:high`

Build tooling to publish content to Gumroad.
- Research Gumroad API capabilities
- Create `tools/content/publish/gumroad.ts`
- Handle product creation, updates, and file uploads
- Integrate with book.yaml metadata

## Priority: Medium

### 4. Kobo Writing Life Publisher Integration
**Labels**: `enhancement`, `priority:medium`

Build tooling to publish ebooks to Kobo Writing Life.
- Research Kobo API/upload process
- Create `tools/content/publish/kobo.ts`
- Handle EPUB generation from markdown
- Integrate ISBN management

### 5. Content Quality Scoring
**Labels**: `enhancement`, `priority:medium`

Add quality scoring to generated content to filter what gets promoted.
- Score based on: session length, topic diversity, code examples, file changes
- Set minimum thresholds for auto-promotion
- Flag high-quality drafts for human review

### 6. Substack API Research
**Labels**: `enhancement`, `priority:medium`, `blocked`

Investigate Substack API limitations and workarounds.
- Document what's possible via API
- Explore browser automation alternatives
- Determine if Substack integration is viable

### 7. Session Log Aggregation Across Projects
**Labels**: `enhancement`, `priority:medium`

Aggregate related sessions across multiple projects into single content pieces.
- Identify sessions with similar topics/niches
- Merge insights from multiple sessions
- Handle conflicting or outdated information

## Priority: Low

### 8. Content Outline Generator
**Labels**: `enhancement`, `priority:low`

Generate book outlines from session clusters.
- Group sessions by niche
- Identify chapter-worthy topics
- Suggest outline structure
- Pre-populate book.yaml

### 9. Interactive Content Preview
**Labels**: `enhancement`, `priority:low`

Add local preview server for content.
- Markdown → HTML rendering
- Hot reload on changes
- Mobile-responsive preview

### 10. Analytics Dashboard
**Labels**: `enhancement`, `priority:low`

Track content generation metrics.
- Sessions processed
- Content generated
- Publishing success rates
- Most common niches

---

## Blocked

### Substack Integration
Blocked on API research. Substack doesn't have a public API for posting.

---

## Notes for Workers

When picking up an issue:
1. `gh issue edit <number> --add-assignee @me`
2. `gh issue edit <number> --add-label "in-progress"`
3. Create feature branch
4. Implement with tests
5. Self-review and merge
6. Close issue
