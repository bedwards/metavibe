---
title: "Fail Fast, Hard, and Ugly"
slug: fail-fast-hard-and-ugly
status: published
date: 2025-12-17
updated: 2025-12-17

description: |
  Why production code should never contain mock data, shims, or
  fake implementations. If something isn't implemented, throw an
  error that no one can miss.

tags:
  - production
  - quality
  - debugging
  - vibe-coding

audience:
  - Developers shipping production code
  - Team leads reviewing code quality
  - Anyone who's been burned by hidden failures

publishing:
  github_pages: true
  gumroad: false
  kobo: false
---

# Fail Fast, Hard, and Ugly

Mock data is a lie. It looks like data. It behaves like data in demos. But it's not connected to anything real. The feature that "works" in the demo will fail in production when actual data is expected.

The temptation is strong. You need to demo a feature. The backend isn't ready. You return hardcoded values. The demo goes well. The hardcoded values stay in the codebase, commented with "TODO: implement." Months later, someone assumes it works. It doesn't.

If a feature isn't implemented, throw an error. Not a polite error. Not a subtle error. An error so obvious that no one can miss it. The function name, the missing integration, specific instructions for what needs to happen.

The code pattern is simple. Where you might return mock data, throw instead. The error message should tell future developers exactly what's missing. "NOT IMPLEMENTED: getUser requires database integration" is infinitely more useful than returning a fake user object.

Silent fallbacks are the subtler version of the same problem. The try-catch that returns null when the database fails. The API call that returns empty results when the service is down. These look like they're handling errors gracefully. They're actually hiding errors completely.

A database error means the database isn't working. Returning null means the caller thinks there's just no data. The distinction matters enormously for debugging. One tells you where to look. The other sends you hunting through application logic that was never the problem.

The UI must reflect reality. Every button should either work end-to-end or throw a clear error. Users and developers must immediately see what's real and what's not. A button that looks functional but does nothing is worse than no button at all.

Frontend error handling should surface implementation errors prominently. Not as a subtle toast that disappears after three seconds. As a blocking modal. As an error state that demands attention. The error should say what's not implemented and optionally how to implement it.

The why behind this philosophy is simple. Mock data hides integration bugs until production. Silent failures create debugging nightmares. "Working" demos that aren't connected create false confidence. Future developers waste time figuring out what's real and what's fake.

The inversion is liberating. When if it looks like it works, it must actually work becomes the rule, you know where you stand. Every feature that appears in the UI is a real feature. Every API endpoint returns real data. There are no hidden lies waiting to surface.

Testing benefits too. A test that exercises mock data tests nothing. A test that exercises real integrations tests real behavior. The discipline of no mock data extends to test environments—they should use real databases, real services, real everything that matters.

The exception is clearly marked demo modes. Some products have explicit demo functionality where fake data is the point. But this should be explicit—a demo flag, a demo account, an obviously-fake environment. Not production code that sometimes returns fake data.

Roblox development follows the same principle. Luau code that would normally return a placeholder player object should error instead. "NOT IMPLEMENTED: GetPlayerData requires DataStore integration." The game either works or it obviously doesn't.

The Anthropic engineering blog contains related guidance: verify like a user. If you test like a user would, you'll discover the features that don't actually work. The fake data disappears when real users appear. Better to discover this while developing than in production.

Code review should catch these patterns. A function returning hardcoded data? Flag it. A try-catch that swallows errors and returns defaults? Flag it. A TODO comment near returned data? Flag it. These patterns should not survive review.

This philosophy produces code that's honest about its state. Implemented features work. Unimplemented features fail loudly. The gap between demo and production shrinks to zero. What you see is what you get.
