---
title: "The Pre-commit Hook Philosophy"
slug: the-pre-commit-hook-philosophy
status: published
date: 2025-12-17
updated: 2025-12-17

description: |
  Why you should never bypass pre-commit hooks with --no-verify,
  and how to design hooks that developers actually want to run.

tags:
  - git
  - quality
  - automation
  - vibe-coding

audience:
  - Developers working in team environments
  - DevOps engineers designing CI/CD pipelines
  - Anyone who has been tempted to use --no-verify

publishing:
  github_pages: true
  gumroad: false
  kobo: false
---

# The Pre-commit Hook Philosophy

The --no-verify flag exists in git. It bypasses pre-commit hooks entirely. Some developers use it routinely, treating hooks as optional suggestions rather than mandatory gates. This practice corrodes code quality slowly, invisibly, and inevitably.

Never use --no-verify. Not once. Not when you're in a hurry. Not when you're confident the change is safe. Not when the hook is taking too long. The moment you bypass hooks once, you'll bypass them again. The exception becomes the rule.

Pre-commit hooks exist for a reason. They catch problems before they become commits. A commit with lint errors, type errors, or failing tests is a commit that shouldn't exist. Fixing it later is more expensive than fixing it now. The hook is doing you a favor.

The hooks should run quickly. A few seconds, not minutes. If your hooks take too long, the problem isn't the hook concept—it's the hook implementation. Optimize the hook rather than bypassing it. Run only the checks that can run quickly. Save slow checks for CI.

What should hooks check? The essentials that prevent broken commits. Type checking catches errors that would break at runtime. Linting catches style issues and common bugs. Test suites catch regressions. Secret scanning catches credentials that should never be committed.

Type checking deserves inclusion because TypeScript errors are show-stoppers. Code that doesn't type-check doesn't work. Committing it just delays the inevitable fix while polluting the history with broken states. Run tsc --noEmit as a hook.

Linting deserves inclusion because consistent code is maintainable code. Style debates are boring—let the linter decide. Configure it once, enforce it always. Run eslint with zero warnings tolerance. Warnings are noise; either the rule matters or it doesn't.

Tests deserve inclusion if they run quickly. A comprehensive test suite might take minutes—that's too slow for a hook. But a core smoke test that verifies basic functionality can run in seconds. Include what's fast enough to not frustrate developers.

Secret scanning deserves inclusion because committing credentials is catastrophic. Once a secret hits the repository history, it's compromised forever. Rotating credentials is painful. Detecting secrets before commit is essential. Tools like git-secrets or gitleaks run quickly and prevent disasters.

The hook output should be helpful, not cryptic. When a check fails, the developer needs to know what failed and how to fix it. Generic failure messages waste time. Specific messages enable quick resolution.

Our projects include comprehensive pre-commit hooks that run in a few seconds. Check for secrets in staged files. Validate YAML frontmatter in content files. Run TypeScript type checking. Run the linter with zero warnings policy. Run the test suite. All of this completes in under five seconds for most commits.

The rule against --no-verify is documented explicitly. CLAUDE.md in every project states it clearly: never bypass the hook. The reasoning is spelled out. New contributors see this immediately. The expectation is set.

When the hook fails, fix the issue. Don't search for ways around it. The hook caught something that would have been a problem. Thank the hook and fix the problem. This mindset shift—from "the hook is blocking me" to "the hook is helping me"—is essential.

Some developers argue that hooks slow them down. They want to commit work-in-progress without meeting quality bars. This impulse is understandable but misguided. Git stash exists for work you're not ready to commit. Branches exist for exploratory work. If you're not ready to meet quality standards, you're not ready to commit.

The investment in good hooks pays compound returns. Every broken commit avoided is debugging time saved. Every consistent style choice is a code review argument prevented. Every caught secret is an incident avoided. The seconds spent running hooks save hours of fixing problems that hooks would have prevented.

AI-assisted development makes hooks even more important. Claude generates code quickly—fast enough that human review struggles to keep up. Automated hooks provide the quality gate that ensures generated code meets standards before it becomes part of the codebase.

The hook configuration belongs in the repository. Not in individual developer machines, not in external systems—in the repo, versioned alongside the code. This ensures everyone runs the same checks. No "it works on my machine" for hook configuration.

Husky is the standard tool for managing JavaScript/TypeScript project hooks. It sets up the hooks during npm install, ensuring everyone has them. lint-staged runs checks only on staged files, keeping hooks fast. Combined, they provide a solid foundation for hook infrastructure.

Test your hooks. Intentionally break things and verify the hook catches them. Add a type error; verify tsc fails. Add a lint violation; verify eslint catches it. Commit a fake API key; verify secret scanning alerts. Trust but verify.

The philosophy extends to CI. What hooks check locally, CI should check in the pipeline. This catches anything that slipped through—perhaps someone did use --no-verify despite the policy. CI is the safety net; hooks are the first line of defense.

Pre-commit hooks represent a commitment to quality that happens before problems exist rather than after. Every team that adopts this philosophy reports the same thing: initial resistance gives way to appreciation. The hooks become invisible because they always pass, which means they're working.
