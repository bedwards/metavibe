# Introduction

Horror games have a unique power: they make players *feel* something. Not just challenged or entertained, but genuinely unsettled. Building that experience is hard. Building it in Roblox—a platform often associated with casual games—is harder.

This book shows you how.

## Why Survival Horror?

Survival horror sits at the intersection of several game design challenges:

1. **Atmosphere over action** - You can't just throw enemies at players. The tension must build through environment, sound, and pacing.

2. **Resource scarcity** - Every bullet, every health kit matters. Managing scarcity creates genuine stakes.

3. **Vulnerability** - Players must feel underpowered. The creature is a threat, not a target.

4. **Mystery** - Horror thrives on the unknown. What's behind that door? What made that sound?

These constraints force you to think deeply about game design. You can't brute-force a horror game with better graphics or more content.

## Why Roblox?

Roblox might seem like an odd choice for horror. But consider:

- **Massive audience** - Millions of players, many hungry for new experiences
- **Low friction** - Players don't download your game, they just join
- **Multiplayer built-in** - Co-op horror is trivial to implement
- **Lua/Luau** - A forgiving, expressive scripting language
- **Rojo** - Professional tooling for version control and team development

The platform's limitations actually help. You can't rely on photorealistic graphics, so you focus on what matters: atmosphere, sound, and mechanics.

## Why Vibe Code It?

Vibe coding is AI-assisted development where you describe what you want and let AI handle the implementation. For game development, this means:

- **Rapid prototyping** - Describe a creature behavior, get working code in minutes
- **Exploring ideas** - "What if the creature could hear the player's footsteps?" Try it immediately.
- **Learning Roblox APIs** - AI knows the platform better than you do (at first)
- **Staying in flow** - Less time debugging syntax, more time designing

This book doesn't just teach you Roblox game development. It teaches you how to *collaborate with AI* to build games faster than you thought possible.

## What We'll Build

By the end of this book, you'll have built:

- A complete survival horror game framework
- Atmospheric lighting and sound systems
- Creature AI with detection and chase behaviors
- Survival mechanics (health, stamina, inventory, crafting)
- Terrain and level design tools
- Multiplayer support for co-op horror

More importantly, you'll understand the *patterns* behind these systems. Every horror game is different, but the principles transfer.

## Prerequisites

You'll need:

- **Roblox Studio** - The development environment
- **Rojo** - For professional project management (`cargo install rojo` or use the VS Code extension)
- **Git** - For version control
- **An AI assistant** - Claude Code, Cursor, or similar
- **Basic Luau knowledge** - Variables, functions, tables. We'll teach the rest.

## How to Use This Book

Each chapter builds on the previous one, but they're designed to be self-contained references. Read front-to-back for a complete learning experience, or jump to specific chapters when you need them.

Code examples are practical, not minimal. We show you real patterns from production games, not toy examples that fall apart at scale.

Let's build something scary.
