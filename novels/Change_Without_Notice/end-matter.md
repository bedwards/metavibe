# End Matter

---

## About the Author

Brian Edwards is a software engineer and writer based in Waco, Texas. He builds things with generative AI agents.

---

## How This Book Was Made

This novel was written in a single session with Claude Opus 4.5, Anthropic's generative AI model, on December 27, 2025. The following describes the exact process.

### The Planning Phase

The human provided three planning documents:

**taste.md** - A research document defining the prose style. Two authors were studied: Franz Kafka for structural method, Karl Ove Knausgaard for sentence-level technique. The document contained specific, actionable instructions. For Kafka: climax in the opening sentence, limited perspective, world-building through exclusion, unresolvable conflict, bureaucracy as antagonist. For Knausgaard: flatness over elegance, embrace of cliche, loping sentences, mundane detail, speed through density, anti-Proust forward motion.

**rough_ideas.md** - A list of 326 world concepts. Each world required a distinct scenario. The human generated these ideas and provided them to the agent.

**outline.md** - An execution plan organizing the 326 worlds into 14 chapters across 7 acts. Tables specified world ranges, themes, and writing instructions. The document included rules: transformation already complete at opening, establish world through what the protagonist doesn't know, present unresolvable demand, end incomplete.

### The Writing Phase

The agent wrote one chapter at a time. Each chapter contained 15-26 worlds. Each world ran 500-800 words. The agent followed the outline exactly, writing world by world, applying the style constraints from taste.md.

The agent used a todo list to track progress. Items marked: "Write Chapter 1 (Worlds 1-15)" then "Write Chapter 2 (Worlds 16-30)" and so on through Chapter 14.

Each world followed a structure:
- Open with the situation already transformed
- Establish the world through dialogue and description
- Show the protagonist attempting to navigate the situation
- End before resolution

The agent did not deviate from the outline. The agent did not add commentary or meta-text. The agent wrote the worlds in order, from 1 to 326.

### The Editing Phase

After completing the 326 worlds, the agent made a second pass. The editing focused on:

- Tightening prose by 15-20%
- Converting flowing sentences to fragments where appropriate
- Removing redundant dialogue attributions
- Strengthening opening lines to place the climax first
- Varying sentence structure to reduce repetitive patterns
- Adding references to the protagonist's accumulated memory across realities

The agent read chapters from the beginning, middle, and end to identify patterns. Edits were made systematically: Chapter 1 first, then Chapters 2-4, then 5-7, then 8-10, then 11-14.

### The Technical Details

- Model: Claude Opus 4.5 (claude-opus-4-5-20251101)
- Interface: Claude Code CLI
- Session length: Single continuous session
- Output: 14 markdown files, approximately 180,000 words total
- Time: Approximately 4 hours of agent execution

### What the Human Did

The human:
- Wrote the three planning documents
- Provided the initial prompt
- Monitored progress
- Requested the editing pass
- Requested this end matter and format conversion

### What the Agent Did

The agent:
- Read and interpreted the planning documents
- Wrote 326 worlds following the outline exactly
- Tracked progress with a todo list
- Made editing passes to tighten prose
- Created front matter and end matter
- Converted to multiple formats

### Reproducibility

The same output would not be produced by running this process again. Generative AI produces different text on each run. However, the structure would be identical: 326 worlds, 14 chapters, following the outline, applying the style constraints.

The planning documents are available in the plan/ directory of this novel's source files.

---

## Colophon

Set in the reader's default system font.

Produced using Claude Code.

First published December 27, 2025.

---

Brian Edwards
Waco, Texas
December 2025
