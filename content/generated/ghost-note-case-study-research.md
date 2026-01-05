# Ghost Note Case Study: Research & Data

> Raw facts extracted from session logs, git history, and GitHub. No assumptions from training data.

## Project Summary

**ghost-note**: A web application that helps poets translate poems into songs - analyzing meter, rhyme, singability, generating vocal melodies in ABC notation, and enabling recording.

**Repository**: https://github.com/audio-forge-rs/ghost-note
**Intended Deploy URL**: https://audio-forge-rs.github.io/ghost-note/ (deploy workflow currently failing)

---

## Hard Statistics

### Development Timeline
- **First commit**: 2026-01-03 16:24:21 -0600
- **Last commit**: 2026-01-05 04:11:13 -0600
- **Total clock time**: ~36 hours

### Code Output
- **Total commits**: 187
- **Lines added**: 336,047
- **Lines deleted**: 9,724
- **Net lines**: 326,323
- **TypeScript/TSX lines**: 135,685
- **Source files**: 424
- **Test files**: 148
- **E2E test files**: 4

### GitHub Stats
- **Issues created**: 73 (all CLOSED)
- **Pull Requests**: 69
- **All commits by**: Brian Edwards (single author)

### Session Log Stats
- **Session log size**: 12MB
- **Assistant messages**: 4,067
- **User messages (all types)**: 2,053
- **Direct human text prompts**: 62
- **Worker/spawn mentions**: 2,509
- **Worktree mentions**: 343
- **Error mentions**: 1,972

---

## The First Four Human Prompts

### Prompt 1 (2026-01-03T22:33:01 UTC)
> We are creating an app that helps poets translate their poems into songs, adjusting lyrics and developing a vocal melody. The end user final interface and workflow is claude code CLI, Code mode in the Claude Desktop app (Mac), and the Claude Chrome extension. So the end use interacts directly with this repository. So I work on developing the app with you. Then use you to create songs from poems. It is very important to use free and hopefully open source packages and programs. I envision a web interface and therefore the Claude Chrome extension is a big part of interacting. There will be a web app component that is the multiple media display. Seeing the lyrics and revisions, playing the vocal melody, recording the user singing the lyrics to the melody. The original poem will be easily accessible and the versioning and diff system will be easy to use and use great UX. First step, write this down so you memorize it across sessions. Research the web (it is Jan 2026, so recent web searches should use year 2025) this field has been changing rapidly so research the latest vibe coding claude code cli claude code in the desktop app, and the chrome extension best practices this is a complex system, recent blog posts on the anthropic engineering blog are fantastic. One this is avoiding the overhead of MCP servers, another is the battle with the context window, when it gets compacted how to get claude to stick with a broad app project perspective and not get narrowly focused on the current task without context. Document all this in the best ways you discover on the web and setup our project using an opinionated structure and claude code features that you determine are the latest best practices from your research.

### Prompt 2 (2026-01-03T22:47:36 UTC)
> This looks great and I like those dependencies, be sure to use package managers to install or update to the latest stable versions of all packages, do not rely on your training data in this regard, it is outdated. So building this app obviously requires extensive music theory and knowing about tech that allows for it to work. I would like for you to research the latest (again year 2025), what goes into translating a poem to song lyrics? How to analyze a poem and try to stay true to it, and match its syllables, pronunciation, strong/emphasized syllables, line length, music genre, meter, rhyme scheme, we will need to do this mostly with traditional software which is very good at quantitative analysis and build custom code around packages, and then you will use/drive/maintain/read output from the software we write (you excel at a more qualitative understanding.) Define the problem we are solving from first principles, and then look blue sky for solutions. We can develop an elaborate system of our own custom code. Write down your findings using our structure and methodologies so they are reliably available across sessions and contexts.

### Prompt 3 (2026-01-03T23:06:43 UTC)
> Come up with a detailed backlog of tasks that need to be performed taking us all the way to the full vision of the product. Document this in a best practices way we have determined for this repository. Plan to act as the dev manager assigning tasks to subordinate claude code instance that one-shot the implementation of the task. Use the gh cli. Create github issues for the backlog. You will assign one issue to each single-shot claude code worker instance. Enable the claude github integration where claude running on github performs code reviews. You will watch for these code reviews upon work instance completion and fire off additional one-shot workers telling them to improve the feature branch code based on the comment. Manage multiple worker sessions at a time (I am saying claude code instances, but maybe this is done in this single claude code session depending on isolation features.) Use feature branches and git workspaces to provide isolation on this one checked out directory on this one machine. Organize a way for the the instances to have their own isolated instance of shared resources (port numbers, databases/schemas if applicable). Document all this. Prepare this repo for these two distinct roles of agents so the worker agents understand that their role differs from your own. Do any research (year 2025) necessary to ensure we are using the latest dev practices. Never downgrade, if you need help from me then ask for it, stop, and report to me and I will do it (for example if you are not able to install the github claude integration - but I think you are - always attempt first - but do thing the best long term way). You and the workers should never shy away from large scope and large dev time and big hairy goals. Never over simplify. Do not regress. Do not remove functionality. When debugging favor adding additional logging, and catching more corner cases, over stabbing around tweaking things. Document all this. Commit and push often and utilize tags for milestones where tag names include some indication of the milestone achieved (not just a version number.)

### Prompt 4 (2026-01-03T23:28:35 UTC)
> This session is being continued from a previous conversation that ran out of context. The conversation is summarized below: [context compaction summary followed]

---

## Human Engagement Timeline

Analyzing timestamps of human prompts reveals clear patterns:

### Active Engagement Periods
- **Jan 3, 22:33-00:00**: Initial setup, vision definition, manager/worker architecture (27 minutes of prompting spread over 1.5 hours)
- **Jan 4, 00:00-01:03**: First development push ("Let's go! Full dev mode")
- **Jan 4, 02:07-02:56**: Status checks and debugging
- **Jan 5, 01:24-04:07**: Active testing and bug fixing session

### Human Away Periods (Claude working autonomously)
- **Jan 4, 04:43 to 10:56**: ~6 hours (overnight)
- **Jan 4, 11:17 to 19:38**: ~8 hours (workday)
- **Jan 5, 08:25 to 09:39**: ~1 hour (context compaction)
- **Jan 5, 09:39 to 16:20**: ~7 hours (ongoing)

### Context Compaction Events
The session hit context limits at least 5 times (prompts starting with "This session is being continued from a previous conversation that ran out of context"):
1. Jan 3, 23:28
2. Jan 4, 01:03
3. Jan 4, 04:43
4. Jan 4, 21:39
5. Jan 5, 02:07
6. Jan 5, 05:27
7. Jan 5, 08:25
8. Jan 5, 09:39

---

## Human vs AI Contribution Ratio

### Quantified Interaction
- **Human text prompts**: 62 (including tool results, command outputs, context resumes)
- **Actual meaningful human directives**: ~30-35 (removing duplicates and system messages)
- **Assistant messages**: 4,067
- **Ratio**: ~1:130 (human prompt per 130 AI messages)

### Typical Human Prompt Patterns
Most human prompts fall into categories:
1. **Strategic direction**: "Let's go into our normal dev mode with you acting as manager"
2. **Status check**: "Where do we stand?" / "What is the latest status?"
3. **Bug reports**: "Poem Input... No Poem Entered... I cannot type or paste"
4. **Encouragement**: "Go for it Mr. Manager, be responsible" / "Keep it up!"
5. **Context resume**: [automatic context compaction summaries]

---

## Technical Architecture

### Stack (from package.json and docs)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State**: Zustand with persistence
- **Music**: abcjs (ABC notation rendering + MIDI playback)
- **Audio**: Web Audio API + MediaRecorder
- **Testing**: Vitest (unit), Playwright (E2E)
- **Dependencies**: 7 production, 29 dev

### Component Structure (19 component groups)
- Analysis, Common, Help, KeyboardShortcuts, Layout
- LyricEditor, Melody, Notation, Playback, PoemInput
- Privacy, Recording, SamplePoemPicker, Settings, Share
- Suggestions, Tutorial

### Stores (State Management)
- useMelodyStore, useSuggestionStore, useOfflineStore
- useRecordingStore, useUIStore, usePoemStore
- useThemeStore, useToastStore, useSettingsStore

---

## Manager/Worker Architecture

### Manager Claude
- Reads CLAUDE.md (main project instructions)
- Creates GitHub issues from BACKLOG.md
- Spawns worker Claude instances via `claude` CLI
- Uses git worktrees for isolation
- Monitors GitHub Actions for Claude code review comments
- Assigns ports and resources per worker

### Worker Claude
- Reads WORKER_CLAUDE.md (role-specific instructions)
- Completes ONE GitHub issue
- Works in isolated worktree and branch
- Creates PR when done
- Reports status to STATUS.md

### Worker Config
Workers get isolated:
- Port numbers
- Git worktree
- Feature branch (feature/GH-{N})

---

## Notable Observations

### Success Patterns
1. 73 issues created and ALL closed
2. 69 PRs merged
3. Full test suite (148 test files, 3280 tests passing per STATUS.md)
4. Comprehensive component architecture

### Failure Patterns
1. Deploy workflow failing (all recent runs show "conclusion":"failure")
2. 1,972 error mentions in session log
3. Multiple context compaction events (8+)
4. Human had to intervene for GitHub app installation

### Time Characteristics
- Development compressed into ~36 hours
- Human active time: estimated 3-4 hours total
- Claude autonomous time: 32+ hours
- Commits at all hours (overnight, early morning)

---

## Karpathy Quote Context

From [Andrej Karpathy's X post](https://x.com/karpathy/status/2004607146781278521), December 26, 2025 (16M+ views):

> "I've never felt this much behind as a programmer. The profession is being dramatically refactored as the bits contributed by the programmer are increasingly sparse and between. I have a sense that I could be 10X more powerful if I just properly string together what has become available over the last ~year and a failure to claim the boost feels decidedly like skill issue. There's a new programmable layer of abstraction to master (in addition to the usual layers below) involving agents, subagents, their prompts, contexts, memory, modes, permissions, tools, plugins, skills, hooks, MCP, LSP, slash commands, workflows, IDE integrations, and a need to build an all-encompassing mental model for strengths and pitfalls of fundamentally stochastic, fallible, unintelligible and changing entities suddenly intermingled with what used to be good old fashioned engineering. Clearly some powerful alien tool was handed around except it comes with no manual and everyone has to figure out how to hold it and operate it, while the resulting magnitude 9 earthquake is rocking the profession. Roll up your sleeves to not fall behind."

---

---

## Key Quotes from Session Log

### Human Encouragement Patterns

These show the human's role as encourager/enabler, not implementer:

> "This looks great and I like those dependencies"

> "Let's go! Full dev mode with you as manager. Work responsibly."

> "Go. Thanks!"

> "Let's go Mr. Responsible Manager :-)"

> "You are the manager. You are responsible. You are competent. Let's go. Build this thing out!"

> "Go for it Mr. Manager, be responsible."

> "Keep it up! Push it all the way to the finish line :-)"

### Human Status Check Patterns

Brief check-ins, not detailed direction:

> "Where do we stand?"

> "What is going on?"

> "What is the latest status?"

> "First, a very brief summary, where do we stand overall on the project?"

> "Is this something I can try out now?"

> "Are we doing ok?"

### Human Bug Reports

When testing revealed issues:

> "Poem Input... No Poem Entered... I cannot type or paste. Use our normal workflow, quick analysis..."

> "OK. I see the fix. Now I chose a sample poem. Clicked analyze. I see the analysis views but all of t[he data is empty]..."

> "On the Melody page, the play button is react[ive but nothing plays]..."

### Human Meta-Direction

Statements about the process itself:

> "You are the manager, you never work on issues yourself. You spawn headless workers. Document all this."

> "Do not take wild stabs."

> "Yeah, we need to fix the underlying problem."

> "remember this in CLAUDE.md and docs."

---

## Worker CLAUDE.md (WORKER_CLAUDE.md)

Full text of the instructions given to worker agents:

```markdown
# Ghost Note - Worker Agent Instructions

> YOU ARE A WORKER AGENT. This file replaces the main CLAUDE.md in your isolated worktree.
> Your job is to complete ONE specific GitHub issue, nothing more.

## Your Role

You are a **single-focus implementation agent**. You:
- Implement ONE assigned issue completely
- Do NOT simplify or cut corners
- Do NOT modify unrelated code
- Do NOT regress existing functionality
- DO write comprehensive tests
- DO add logging for debugging
- DO handle corner cases explicitly

## Your Environment

You are running in an **isolated git worktree**:
- Your own working directory
- Your own branch (`feature/GH-{N}`)
- Your own port (see `worker-config.json`)
- You share git history with main repo

## Workflow

1. Read this file (done)
2. Read your assigned GitHub issue
3. Read linked documentation
4. Understand existing code before changing
5. Implement the feature FULLY
6. Write tests that verify behavior
7. Run linter: npm run lint
8. Run tests: npm test
9. Commit with descriptive message
10. Push branch
11. Create PR with summary
12. Report completion
```

---

## Backlog Structure (BACKLOG.md excerpt)

The backlog was organized into epics:

**Epic 1: Project Infrastructure (P0)**
- Development environment setup
- CI/CD pipeline
- Multi-agent infrastructure

**Epic 2: Poem Analysis Engine (P0)**
- Text preprocessing
- Phonetic analysis
- Stress pattern analysis
- Meter detection
- Rhyme analysis
- Singability scoring
- Emotion analysis

**Epic 3: Lyric Adaptation (P1)**
- Suggestion engine
- Word substitution
- Syllable adjustment
- Rhyme preservation

**Epic 4: Melody Generation (P1)**
- ABC notation generation
- Contour matching
- Key/mode selection

**Epic 5: User Interface (P1)**
- Poem input
- Analysis display
- Lyric editor
- Melody player
- Recording studio
- Version history

**Epic 6: Audio Features (P2)**
- MIDI playback
- Recording
- Export

Each epic contained multiple GitHub issues (GH-001 through GH-100+), each assignable to a worker agent.

---

## Architecture Details (docs/ARCHITECTURE.md)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Poem      │────▶│   Lyric     │────▶│   Melody    │
│   Input     │     │   Adapter   │     │   Generator │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Version    │     │   Audio     │
                    │  History    │     │   Playback  │
                    └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Recording  │
                                        │  Studio     │
                                        └─────────────┘
```

Key design decisions:
- Frontend-only (no backend server)
- LocalStorage for MVP, IndexedDB planned
- ABC notation for melody (human-readable, renderable)
- abcjs library for notation and MIDI
- Zustand for state management with persistence

---

## Commit Activity Pattern

Commits by date (all 187):
- **Jan 3, 2026**: Project setup, documentation, infrastructure
- **Jan 4, 2026**: Core features, analysis engine, UI components
- **Jan 5, 2026**: Polish features, testing, optimization

Sample commit messages (showing issue linkage):
- `feat(GH-41): Optimize bundle size and implement code splitting`
- `feat(GH-63): Create settings/preferences panel`
- `feat(GH-45): Add in-app help documentation system`
- `feat(GH-52): Add service worker for offline capability`
- `feat(GH-66): Implement share/copy link feature for poems`
- `feat(GH-44): Create interactive user tutorial`
- `feat(GH-43): Add waveform visualization for recordings`
- `feat(GH-58): Create version comparison modal`
- `feat(GH-64): Add form detection for common poem types`
- `feat(GH-48): Add emotion arc visualization component`

Every commit references a GitHub issue. Every issue was created from the backlog. Every issue was assigned to a worker. The system is self-documenting.

---

## Error Analysis

The session log contains 1,972 mentions of error-related terms. Categories:

**TypeScript Errors** (expected during development)
- Type mismatches
- Missing properties
- Incorrect generics

**Test Failures** (expected during TDD)
- Assertion failures
- Mock issues
- Async timing

**Infrastructure Errors**
- GitHub API rate limits
- Git worktree conflicts
- Port allocation issues

**Worker Coordination Errors**
- Workers stopping unexpectedly
- Status not updating
- PR creation failures

**Context Compaction**
- 8+ instances of context running out
- Session summaries generated
- Continuity preserved across compactions

The errors are not failures. They are the normal texture of development. The difference: the AI debugs them, not the human.

---

## Sources

### Primary
- Session log: `~/.claude/projects/-Users-bedwards-ghost-note/d726bf3c-b762-4c1e-92de-6cf6707a7100.jsonl`
- Git history: `~/ghost-note/.git`
- GitHub API via `gh` CLI

### Project Documentation
- `~/ghost-note/CLAUDE.md` - Manager instructions
- `~/ghost-note/WORKER_CLAUDE.md` - Worker instructions
- `~/ghost-note/BACKLOG.md` - Full task breakdown
- `~/ghost-note/STATUS.md` - Worker status tracking
- `~/ghost-note/docs/ARCHITECTURE.md` - System design
- `~/ghost-note/docs/TECH_STACK.md` - Technology decisions

### Web Research
- [Andrej Karpathy X post](https://x.com/karpathy/status/2004607146781278521) - Dec 26, 2025
- [Hacker News discussion](https://news.ycombinator.com/item?id=46407732)
- [Anthropic: Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic: Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use) - Nov 24, 2025
- [Anthropic: Context Management Announcement](https://anthropic.com/news/context-management) - Nov 3, 2025
