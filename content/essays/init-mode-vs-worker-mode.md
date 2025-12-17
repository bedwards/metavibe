---
title: "Init Mode vs Worker Mode"
slug: init-mode-vs-worker-mode
status: published
date: 2025-12-17
updated: 2025-12-17

description: |
  How to run AI agents in two distinct operational modes—one for setup
  and grooming, another for continuous development. The init/worker pattern
  that enables autonomous AI-first development teams.

tags:
  - automation
  - agents
  - workflow
  - vibe-coding

audience:
  - Developers building AI-assisted workflows
  - Team leads managing AI agents
  - Anyone running long-lived Claude Code sessions

publishing:
  github_pages: true
  gumroad: false
  kobo: false
---

# Init Mode vs Worker Mode

The most effective AI-first development teams run their Claude instances in two distinct modes. Init mode handles setup and maintenance—infrastructure, backlog grooming, issue creation. Worker mode handles production—an infinite loop of picking issues, implementing features, reviewing code, and merging.

This separation isn't arbitrary. It emerges from understanding what AI agents do well autonomously versus what requires occasional human guidance.

Init mode is the manager. When you drop into a repository for the first time, the init agent sets up infrastructure. It creates the project structure, configures tooling, writes the CLAUDE.md that guides future instances. It also handles ongoing maintenance: grooming the GitHub issues backlog, prioritizing work, closing stale issues, creating new issues when it notices problems.

The init agent runs with higher human interaction tolerance. Setup tasks often require clarification—which database, what deployment target, how should authentication work. The init agent asks questions, gets answers, and implements decisions. Once the infrastructure is solid, the init agent's work becomes sporadic—occasional backlog maintenance, periodic cleanup.

Worker mode is the developer. The worker agent runs in an infinite loop without human supervision. Check Discord for urgent messages. Verify the main branch is healthy. Pick the highest-impact issue from the backlog. Implement it. Verify with screenshots and tests. Create a PR, review it yourself, merge it. Post an update to Discord. Repeat forever.

The worker agent has extremely low human interaction. It's not waiting for code review—it reviews its own work. It's not waiting for approval—it merges when ready. It's not asking permission—it follows the guidelines established during init mode and executes independently.

This division enables parallel operation. The init agent might be grooming the backlog on one machine while the worker agent is implementing features on another. They coordinate through GitHub and Discord rather than blocking each other.

The init agent's responsibilities cluster around preparation and maintenance. When starting a new repository, it creates the CLAUDE.md file that documents how Claude should work in this project. It sets up the development environment—package.json configuration, TypeScript settings, linting rules, pre-commit hooks. It configures CI/CD pipelines that will validate the worker's output. It creates the initial issue backlog that the worker will work through.

Ongoing init work happens periodically rather than continuously. The agent checks GitHub rate limits before bulk operations, because the gh CLI uses the GraphQL API heavily and rate limits apply. It creates issues responsibly, batching when necessary. It closes stale issues that no longer apply. It adjusts labels and priorities as the project evolves.

The worker agent's responsibilities cluster around continuous production. The infinite development loop runs without breaks. Each iteration picks work based on impact—what will most benefit real users? The worker implements features fully before moving to the next, following the one-feature-at-a-time principle from the Anthropic engineering blog. It commits frequently, creating checkpoints that enable recovery if something goes wrong.

Verification happens visually. The worker captures screenshots and examines them, applying UI/UX expertise to evaluate layouts. Automated tests run in pre-commit hooks, but visual verification catches problems that tests miss. Does this actually look right? Would a user understand this interface?

The worker merges its own PRs because waiting for human review defeats the purpose of AI-first development. Code review by humans was designed for human limitations—slow reading speed, limited attention, communication overhead. Claude doesn't have those limitations. The worker reviews its own diff, checking for bugs, security issues, style problems. If it passes, it merges. If the Claude GitHub app is configured, it provides an additional review perspective, but the worker doesn't wait indefinitely for that either.

Discord serves as the coordination channel. Both agents post updates there. The init agent announces when it's grooming the backlog or creating infrastructure. The worker agent announces when it starts and finishes features. If main breaks, both agents check Discord before attempting a fix—maybe the other agent is already on it. They post completion messages when fixes land.

The ownership model differs between modes. The init agent owns the development environment and backlog. When infrastructure is broken, the init agent fixes it. When issues are disorganized, the init agent reorganizes them. The worker agent owns the main branch. If main is broken, the worker drops whatever it's doing and fixes it immediately—nothing else matters until main is green.

Error handling follows different patterns too. The init agent encountering authentication issues stops and reports to the human. These are problems the agent genuinely cannot solve—logging into services requires human credentials. The worker agent encountering errors tries to fix them. Tests failing? Debug and fix. Lint errors? Clean them up. Only truly blocked situations—authentication, permission issues—warrant interrupting the human.

The technique that makes this work is thorough documentation in CLAUDE.md. Every project-specific decision gets recorded. Which tools to use. Which patterns to follow. What constraints apply. Future instances—whether init or worker—read this documentation and operate within its guidelines without needing clarification.

Multi-agent coordination scales this pattern. Multiple worker agents can operate in parallel, each on different feature branches, merging independently. They coordinate through the issue assignment system—when an agent picks an issue, it assigns itself and marks it in-progress. Other agents see this and work on different issues. The GitHub issue tracker becomes the shared work queue.

Time-slicing prevents task starvation in worker mode. If the worker only ever works on high-priority bugs, documentation never gets written, tech debt never gets addressed. A time-slice lookup table maps the current minute to a task category. Minute thirty-seven? Work on documentation this time. Minute fifty-two? Address tech debt. This ensures all work categories get attention over time.

The async workflow matters for long-running operations. CI pipelines take minutes to complete. Deployments take time. The worker doesn't wait—it notes the pending operation and switches to other work. Draft PRs serve as work-in-progress markers. When the operation completes, the worker can return and finish that thread. GitHub becomes the source of truth for in-progress work, enabling crash recovery.

Init mode and worker mode represent the mature pattern for AI-first development. The init agent handles what requires human guidance and periodic maintenance. The worker agent handles what can run continuously and autonomously. Together, they produce working software at a pace that human-only teams can't match.
