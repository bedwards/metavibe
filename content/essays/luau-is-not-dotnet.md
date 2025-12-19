---
title: "Luau is Not .NET"
slug: luau-is-not-dotnet
status: published
date: 2025-12-19
updated: 2025-12-19
description: |
  AI assistants trained on multi-language codebases sometimes generate
  .NET patterns that don't exist in Luau. These errors look plausible
  but fail at runtime in confusing ways.
tags:
  - roblox
  - luau
  - debugging
  - vibe-coding
audience:
  - Roblox developers using AI assistants
  - Luau programmers from other language backgrounds
publishing:
  github_pages: true
  gumroad: false
  kobo: false
---

# Luau is Not .NET

The first time you see it, the error message makes no sense. Something about GetHashCode not being a function. You're looking at code that seemed reasonable when the AI generated it, code that follows patterns you've seen in documentation and tutorials. But the method doesn't exist.

AI assistants trained on vast multi-language codebases carry patterns across language boundaries. C# and .NET provide certain methods on every object. GetHashCode returns a unique-ish integer. ToString converts to string representation. Equals performs comparison. These methods feel fundamental because in .NET, they are.

Luau is not .NET.

When an AI writes Luau code but applies .NET intuitions, you get plausible-looking code that fails at runtime. The syntax is valid. The logic seems sound. The method call looks like every other method call. But the method doesn't exist on Luau objects.

Understanding the specific mismatches helps you recognize them immediately.

GetHashCode appears when code needs a unique identifier for an object. Maybe you're implementing a cache, tracking which entities have been processed, building a lookup table. In C#, you'd call GetHashCode and use the result as a key. The AI generates light:GetHashCode() and moves on.

Luau has no GetHashCode. Objects don't inherently provide integer identifiers. The fix involves understanding what you actually need. If you need a unique string identifier, tostring(object) produces one containing a hexadecimal suffix unique to that instance. Extract it with pattern matching: tostring(light):match("%x+$") gives you something usable. Not a true hash, not cryptographic, but sufficient for in-game tracking.

If you need an integer specifically, parse that hex string: tonumber(tostring(object):match("%x+$"), 16) or use zero as a fallback. The result varies between game sessions but stays consistent within a session.

ToString trips up formatting code. You want to log an object's state, display debug information, build an error message. The AI writes creature:ToString() or player:ToString(). Luau doesn't know what you mean.

The fix is straightforward: tostring(object) works on anything. It's a global function, not a method. For Roblox instances, you get the instance's Name property plus identifier. For tables, you get a memory address. For primitives, you get their string representation. Different from .NET's ToString, but functional.

Equals seems redundant until you remember that some languages distinguish identity from equality. In C#, Object.Equals might be overridden to compare values while == compares references. The AI generates entity:Equals(otherEntity) when it wants value comparison.

Luau uses == for all equality comparisons. There's no Equals method. Two references to the same table are equal. Two different tables with identical contents are not equal. This matches reference semantics from most languages, but the method-based pattern from .NET doesn't translate.

The meta-lesson extends beyond these specific methods.

AI assistants interpolate between training data. When generating Luau code, they might borrow patterns from Lua, which Luau extends. They might borrow from JavaScript, which shares some syntactic similarities. They might borrow from C#, which many game developers know. These borrowings occasionally introduce constructs that don't exist in Luau.

The solution is vigilance during code review. When you see a method call that looks like it might come from another language's standard library, verify it. Check the Roblox documentation or run a quick test. The AI doesn't know it made a mistake—the pattern felt natural based on its training. You need to catch these before they reach players.

Some patterns worth watching for: any method starting with Get on primitive types. Any Dispose or using patterns. Any async/await syntax beyond Luau's task library. Any generic type parameters on methods. These all work in C# but don't exist in Luau.

The deeper issue is that language knowledge is fuzzy for AI assistants. They don't maintain separate mental models for each language. They recognize patterns and apply them. Usually this works. When generating Luau inside a Luau file with Luau context, they produce Luau code. But under pressure, when solving a complex problem, patterns from other languages sometimes leak through.

This isn't a flaw to fix—it's a characteristic to understand. Vibe coding means generating code quickly and iterating. Part of iteration is catching these cross-language leaks. Once you recognize the pattern, you can mention it explicitly: "Remember, Luau doesn't have GetHashCode. Use tostring with pattern matching instead." The AI adjusts. Future generations avoid that specific mistake.

The knowledge compounds. Your CLAUDE.md can document the patterns you've corrected. "Luau is not .NET: no GetHashCode, no ToString method, no Equals method. Use tostring() for string conversion and == for equality." The AI reads this at the start of each session and incorporates it into all generations.

Over time, your AI-assisted Luau development becomes cleaner. Not because the AI magically improved, but because you've taught it the specific boundaries of the language you're using. The cross-language leaks that surprised you initially become increasingly rare.

The error messages still look confusing when they appear. "attempt to call a nil value" for a method that seemed like it should exist. But you've seen it before. You know the fix. You move on.

That's the rhythm of vibe coding with languages that share syntax but not semantics. Quick generation, quick recognition, quick correction. The alternative—manually writing every line—takes longer and still occasionally produces the same mistakes. At least with AI assistance, the correction can be automated too.
