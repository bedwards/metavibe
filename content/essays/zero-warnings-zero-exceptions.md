---
title: "Zero Warnings, Zero Exceptions"
slug: zero-warnings-zero-exceptions
status: published
date: 2025-12-17
updated: 2025-12-17

description: |
  Why ESLint warnings are an anti-pattern and how to configure
  linting for zero noise. Either a rule matters or it doesn't.

tags:
  - linting
  - eslint
  - quality
  - vibe-coding

audience:
  - JavaScript/TypeScript developers
  - Team leads configuring linting
  - Anyone tired of ignored warnings

publishing:
  github_pages: true
  gumroad: false
  kobo: false
---

# Zero Warnings, Zero Exceptions

Warnings are noise. They accumulate in the console output, ignored by developers who have seen them a thousand times. A codebase with three hundred warnings is a codebase where warning number three hundred and one goes unnoticed. The signal drowns in the noise.

Either a rule matters or it doesn't. If a rule catches real bugs, make it an error. Fix violations immediately. No exceptions, no suppressions, no "we'll get to it later." If a rule doesn't catch real bugs—if it's stylistic preference or outdated guidance—turn it off. Completely off, not just warnings.

ESLint warnings are an anti-pattern. This isn't a controversial opinion; it's documented analysis from developers who've worked with linting across many projects. Warnings become wallpaper. Errors demand attention.

Our approach is explicit. Configure eslint with max-warnings set to zero. Any warning fails the build. This forces a decision on every rule: is it an error or is it off? There is no middle ground.

The rules we keep as errors catch real bugs. no-floating-promises catches unhandled promises that cause silent failures. no-misused-promises catches promise misuse in wrong contexts. The no-unsafe family catches accidental any leakage that defeats type safety. no-explicit-any forces conscious decisions about when type safety is being sacrificed.

Curly enforcement seems stylistic until you consider the bug it prevents. Single-line if statements without braces work fine until someone adds a second line and forgets to add braces. The second line executes unconditionally, not inside the conditional. This bug is subtle and nasty. Requiring braces prevents it.

The prefer-ts-expect-error rule has an interesting property: it fails when the suppression is no longer needed. If you suppress a type error with ts-expect-error and then the underlying issue is fixed, the suppression itself becomes an error. This keeps suppression comments from outliving their usefulness.

The rules we disable are noisy or redundant. explicit-function-return-type demands explicit return types on every function, but TypeScript infers these correctly. The rule adds verbosity without catching bugs. Off.

no-non-null-assertion prohibits the exclamation point operator. But the exclamation point is a useful escape hatch when you know something TypeScript doesn't. Prohibiting it entirely is too aggressive. Off.

restrict-template-expressions wants type checking inside template literals. This is overly pedantic for most uses. You know that number will stringify correctly. Off.

no-unnecessary-condition sounds useful but generates false positives with arrays. Checking if an array element exists before using it seems unnecessary to the rule, but it's often exactly what you want. Off.

The configuration lives in eslint.config.js with comments explaining each decision. Future developers see why rules are on or off. The configuration is documentation.

When you see a lint error, fix it immediately. Don't add eslint-disable comments as a first instinct. Suppressions should be rare, explained, and ideally temporary. If you find yourself suppressing a rule frequently, either the rule is wrong for your codebase (turn it off) or your patterns need to change.

Running lint on pre-commit catches problems before they become commits. Running lint in CI catches anything that slipped through. Both checks enforce the same zero-warnings policy.

The psychological effect matters. A clean lint output—zero warnings, zero errors—becomes the expectation. Any output is anomalous and demands attention. Developers fix issues because fixing them is the normal state of affairs, not because they're being forced to.

Contrast this with the warning-heavy codebase. Three hundred warnings scroll by. Who notices number three hundred and one? Nobody's fixing the existing warnings; nobody notices new ones. The tool has lost its power to influence behavior.

The investment in configuring linting properly pays ongoing dividends. Every bug caught by linting is a bug not debugged in production. Every consistent style choice is a code review discussion avoided. The tool does the boring work so developers can focus on interesting problems.

Zero warnings, zero exceptions. Either it matters or it doesn't. This is the only sustainable approach to linting.
