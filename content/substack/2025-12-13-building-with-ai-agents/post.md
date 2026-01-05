---
title: "Vibe Coding: The Quiet Revolution in How Software Gets Made"
subtitle: "What Anthropic's engineering team learned about AI agents that changes everything"
date: 2025-12-13
tags: [ai, software-engineering, agents, anthropic, vibe-coding]
status: draft
---

Something fundamental shifted in software engineering this year, and most people missed it.

They're calling it "vibe coding"—you describe what you want, the AI builds it. No more wrestling with syntax. No more googling error messages. No more debugging for hours. You guide the vision, Claude handles the implementation.

Not the flashy announcements. Not the benchmark improvements. Something quieter and more consequential: we figured out how to make AI actually work alongside humans to build things.

I spent the last several months studying Anthropic's engineering blog posts—the ones where they share what their team learned building AI systems that ship to millions of users. These aren't marketing materials. They're honest accounts of failures, hard-won insights, and the principles that emerged from trial and error.

What I found surprised me. The breakthroughs weren't about making AI smarter. They were about making AI *usable*. And the gap between those two things is where most projects fail.

## The Problem Nobody Talks About

Here's something that doesn't appear in AI demos: context windows are both the superpower and the fatal flaw.

A context window is how much information an AI can hold in mind at once. It's like short-term memory. Modern models have large ones—equivalent to a thick novel. But here's what the demos don't show: that's rarely enough.

Real software projects sprawl. Codebases have thousands of files. Requirements live in scattered documents. The history of why things are the way they are exists partly in git commits, partly in Slack threads, partly in someone's head. No context window holds all of that.

Anthropic's engineers learned this the hard way: "Agents still face challenges working across many context windows." The singular noun matters. Not "a context window"—the implication being it's just about size—but "many context windows." The challenge is structural.

When an AI runs out of context mid-task, it loses the thread. Like waking up from amnesia in the middle of surgery. You have skills, but you've lost the plot.

## The Two-Part Solution

The breakthrough came from accepting the limitation rather than fighting it.

Anthropic's team developed what they call an "initializer agent" and a "coding agent." The split matters.

The initializer runs first, in its own session. Its job: establish infrastructure. It creates an initialization script for the development environment. It generates a progress file documenting what's been done. It makes a git commit capturing the starting state.

Why does this matter? Because when context inevitably runs out, the next session—the "coding agent"—has breadcrumbs. It reads the progress file, checks git history, and picks up where the previous session left off.

This is not glamorous. It's janitorial work. And it's the difference between AI that demos well and AI that ships code.

The principle underlying this: **don't fight context limits, design for them.**

Traditional programming assumes persistent state. Variables stay defined. Files stay open. The programmer remembers what they were doing when they return from lunch. AI agents can't assume any of this. Every session is a fresh start with notes from a past self.

## The Failure Mode That Killed Projects

Here's what went wrong before they figured this out.

"A major failure mode occurred when agents tried to do too much at once—essentially to attempt to one-shot the app."

The AI would receive a complex task, generate a plan spanning hundreds of steps, and charge forward. Somewhere around step forty-seven, context would run out. The AI would lose track of what it had already done, what still needed doing, and why certain decisions had been made.

The result: half-built systems with inconsistent foundations. Code that worked individually but conflicted when combined. Features that existed in some places but not others.

The solution seems almost insultingly simple: "work on only one feature at a time."

But simple isn't the same as obvious. The instinct—for humans and AI alike—is to plan comprehensively, to see the whole before building the parts. That instinct, in this context, is wrong.

One feature. Complete it. Verify it works. Document what you did. Commit. Then—and only then—move to the next feature.

This isn't about limiting AI capability. It's about accepting that capability means nothing without reliability. A surgeon who can perform any operation but forgets what they're doing halfway through is not a surgeon you want.

## The Verification Problem

There's a deeper issue the Anthropic team uncovered, and it explains a lot of AI failures that seem mysterious from the outside.

"Claude struggled to recognize end-to-end failures without explicit prompting to test as a human user would."

Unit tests pass. Integration tests pass. The AI reports success. But the actual user experience is broken.

This happens because AI optimizes for the metrics it can measure. If you tell it to make tests pass, it makes tests pass. But tests are proxies for user experience, not the thing itself. The map is not the territory.

The fix: "browser automation tools" that test the software "as a human user would." The AI doesn't just run the test suite—it opens a browser, clicks through flows, sees what a user would see.

This creates a tighter feedback loop. The AI learns not just "does the code satisfy the test" but "does the code satisfy the user." Those are different questions with different answers.

The principle: **measure what matters, not what's easy to measure.**

This applies beyond AI. It's why A/B tests sometimes mislead. It's why metrics-driven organizations sometimes optimize themselves into oblivion. Measurement creates a shadow of reality, and we confuse the shadow for the thing.

## Context As Finite Resource

Anthropic's team on context engineering articulated something important: "context, therefore, must be treated as a finite resource with diminishing marginal returns."

This phrase—"diminishing marginal returns"—does real work.

The first thousand tokens of context help enormously. The AI knows what it's working on. The next thousand help somewhat less. You've established the basics; now you're filling in details. By the time you're at a hundred thousand tokens, each additional piece of context helps marginally while pushing out something that might have mattered more.

This is why their guidance emphasizes finding "the smallest set of high-signal tokens that maximize the likelihood of your desired outcome."

High-signal. That's the key word. Not complete. Not comprehensive. High-signal.

What's the difference between context that's comprehensive and context that's high-signal? Comprehensive means "everything that might be relevant." High-signal means "only what's necessary, selected for maximum impact."

Consider giving directions to your house. Comprehensive: every street in the city, every landmark, the complete history of urban planning decisions that led to the current road layout. High-signal: "Take I-95 north, exit 23, left at the light, third house on the right."

AI context works the same way. The instinct to include everything—"just in case it's useful"—actually degrades performance. It's noise masquerading as helpfulness.

## The Tool Design Revelation

One of Anthropic's most counterintuitive findings concerns tools—the external capabilities you give an AI to interact with the world.

"More tools don't inherently improve outcomes."

This violates intuition. More capability seems obviously better. Give the AI access to more APIs, more functions, more options, and surely it will perform better?

No. More tools mean more choices. More choices mean more opportunities for confusion. The AI spends context tokens understanding which tool applies. It sometimes picks wrong. It occasionally hallucinates tools that don't exist because its internal model of "available tools" has gotten fuzzy.

Their recommendation: "thoughtful tools targeting specific high-impact workflows rather than wrapping every API endpoint."

Notice what this means. You're not maximizing capability. You're maximizing *usable* capability. Those are different quantities.

They suggest tool consolidation: instead of separate `list_users`, `list_events`, and `create_event` tools, implement a single `schedule_event` tool that handles the whole workflow. Fewer choices, clearer purpose, better results.

The underlying principle: **capability constrained to context outperforms capability unconstrained.**

This applies to human organizations too. The company that can do anything often accomplishes nothing. The focused company—clear on what it does and doesn't do—ships.

## The Multi-Agent Insight

When a single AI can't handle a task, the obvious solution is multiple AIs. Anthropic explored this extensively.

Their finding: "Three factors explain 95% of performance variance: token usage alone accounts for 80% of variance. Number of tool calls and model selection comprise the remainder."

The 80% number deserves attention. Token usage—how much context gets consumed—explains most of whether a task succeeds or fails. Not the sophistication of the prompt. Not clever engineering. How efficiently context gets used.

This explains why multi-agent systems help: each agent operates in its own context window. You're not splitting work; you're splitting context. The orchestrating agent stays high-level. The worker agents dive deep into specifics. Neither runs out of room.

But multi-agent systems aren't free. "Agents use approximately 4× more tokens than chat interactions; multi-agent systems consume 15× more."

Fifteen times the cost. That's not a rounding error. It means multi-agent architectures only make sense for high-value tasks. The economics filter usage.

## Statefulness And Error Cascade

Here's something that became clear through Anthropic's production experience: errors compound.

"Statefulness compounds errors—minor failures cascade unpredictably."

In traditional programming, most errors are local. A bug in function A doesn't corrupt function B. Isolation is the default.

AI agents are different. They maintain state in their context. An early misunderstanding shapes later decisions. A small hallucination becomes load-bearing. By the time the error manifests visibly, its causes have been buried under layers of subsequent reasoning.

Their response: "implement resumable checkpoints."

A checkpoint is a known-good state you can return to. Instead of one long agent session that accumulates errors, you have multiple shorter sessions, each starting from a verified checkpoint.

This is defensive engineering. Assume things will go wrong. Design so that when they do, recovery is possible.

The Anthropic postmortem of production issues makes this vivid: "The overlapping nature of these bugs made diagnosis particularly challenging." Three separate issues combined to create symptoms none would have caused alone. Debugging required untangling interactions that were never designed to interact.

## The Security Equilibrium

Sandboxing—restricting what an AI can do—seems like it would reduce capability. Anthropic's data shows the opposite.

"Internal usage shows sandboxing reduces permission prompts by 84%."

Sandboxing means the AI can only read and write files in the current directory. It can't access your SSH keys. It can't modify system files. It can't phone home to arbitrary servers.

Why does this *increase* productivity? Because of what they call "approval fatigue."

Without sandboxing, every action requires approval. Can the AI read this file? Can it make this network request? Can it execute this command? The user clicks "approve" repeatedly. Eventually, they stop reading the prompts. They approve automatically.

At that point, security is theater. The user technically has control but practically has none.

Sandboxing changes the equilibrium. The AI has broad permission within narrow boundaries. It can do its job without asking. The user doesn't get fatigued. And when something requests action outside the sandbox, the request is meaningful—a genuine decision point rather than the hundredth routine approval.

The principle: **restrictions that reduce friction are actually expansive.**

This is true beyond AI. Speed limits don't just constrain drivers; they enable everyone to share roads safely. Building codes don't just limit architects; they enable insurance and financing to exist. Constraints create the conditions for activity.

## The Paradox Of Model Intelligence

Anthropic offers guidance that seems obvious once stated but is routinely ignored: "Claude models can diagnose prompts and suggest improvements."

You can ask the AI to critique its own instructions. "What's confusing about this prompt? What information is missing? What would make this clearer?"

The AI will tell you. It knows—in some computational sense of "knowing"—what would help it succeed. And it will articulate that if asked.

Most people never ask. They iterate through trial and error, adjusting prompts based on output quality, never consulting the intelligence they're working with.

This reveals a common misconception: AI as tool rather than collaborator. A hammer doesn't have opinions about how you swing it. An AI does. Ignoring those opinions is leaving value on the table.

## The Debugging Paradox

Anthropic's postmortem reveals a genuine tension: "Our internal privacy and security controls limit how and when engineers can access user interactions with Claude... This protects user privacy but prevents engineers from examining the problematic interactions needed to identify or reproduce bugs."

Privacy-preserving systems are harder to debug. The information needed to fix problems is often the information protected for privacy. There's no clean resolution to this tension—only tradeoffs managed case by case.

Their approach: "continuous production monitoring, more sensitive evaluations, faster debugging tooling, and actively soliciting user feedback."

Notice what's not on that list: accessing user conversations. They committed to finding other ways. Whether those ways are sufficient remains to be seen. The tension persists.

This is worth highlighting because it's tempting to believe problems have solutions. Some do. Some have only less-bad alternatives. Knowing which is which matters.

## What This Means For Building Things

The Anthropic engineering blog posts paint a consistent picture. It's not the picture from AI demos or product marketing.

AI agents work best when:
- Tasks decompose into discrete, verifiable steps
- Each step fits within a single context window
- Progress is checkpointed and documented
- Tools are consolidated and high-signal
- Verification happens as users experience, not just as tests measure
- Errors are expected and recovery is designed in

AI agents struggle when:
- Tasks require holding many things in mind simultaneously
- Context accumulates without filtering
- Verification relies on proxies rather than reality
- Tool choice is unconstrained
- Sessions extend without checkpoints
- Errors compound through state

This isn't pessimism. It's clarity about where AI helps and where it misleads.

The engineers building at Anthropic are not naive about their own technology. They know what breaks. They've documented the failure modes. And they've published what they learned so others can avoid the same mistakes.

That publication—the willingness to share what didn't work—is worth noting. It runs counter to incentives. Marketing wants success stories. Engineering knows progress comes from understanding failure.

## The Foundation Of What Comes Next

This essay started by claiming something fundamental shifted in 2025. Let me be specific about what.

We moved from "AI that demos well" to "AI that ships code." Those are different achievements.

Demoing well requires impressive output for controlled inputs. You pick the examples. You edit the failures. You present the highlight reel.

Shipping code requires reliability across uncontrolled inputs. Users do unexpected things. Edge cases multiply. The code has to work not just in the video but in the hands of thousands of people doing thousands of things.

The Anthropic engineering insights are about bridging that gap. They're unglamorous: checkpointing, documentation, incremental progress, constrained tools. They don't demo well. They ship.

That's the shift. Not smarter AI—we'll get that through continued research. But *usable* AI, today, for real work. The principles are known. The patterns are documented. The tools exist.

## Vibe Coding Is Here

The term "vibe coding" captures something important: the relationship between human and AI has inverted. Previously, AI assisted humans. Now humans guide AI.

You don't need to know the syntax. You don't need to remember which library does what. You describe the vibe—what you want to feel like, work like, look like—and Claude figures out how to make it happen.

This isn't speculation. It's the current state of affairs for anyone using Claude Code seriously. And according to [AI 2027 projections](https://ai-2027.com), capabilities will accelerate dramatically. The agents we have today are early versions of what's coming.

Build your workflows now for how AI works, not how human teams work. Don't impose arbitrary constraints—no PR size limits, no waiting for code review from humans who can't keep up. Let Claude vibe code at the speed of thought.

The foundation is ready. The patterns are documented. What remains is building with them.

---

## References

These insights draw from Anthropic's engineering blog posts published Summer-Fall 2025:

- **"Effective harnesses for long-running agents"** (November 2025): The two-part solution and feature-by-feature progress
- **"Building agents with the Claude Agent SDK"** (September 2025): Agent loops and verification approaches
- **"Effective context engineering for AI agents"** (September 2025): Context as finite resource
- **"Writing effective tools for agents"** (September 2025): Tool design principles
- **"How we built our multi-agent research system"** (June 2025): Multi-agent economics and error cascades
- **"Beyond permission prompts: making Claude Code more secure and autonomous"** (October 2025): Security and approval fatigue
- **"A postmortem of three recent issues"** (September 2025): Debugging and privacy tensions

The primary sources are available at [anthropic.com/engineering](https://www.anthropic.com/engineering).
