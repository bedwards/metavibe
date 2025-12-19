# Lessons Written in Blood

Every pattern in this chapter emerged from failure. Not hypothetical failure—actual bugs that broke the game, confused players, or wasted hours of debugging. These are the lessons you learn after shipping, after watching real problems unfold, after wondering why something that looked correct behaved incorrectly.

Vibe coding accelerates development, but it also accelerates the discovery of these edge cases. When you generate code quickly, you encounter the platform's quirks quickly. What follows represents hard-won knowledge from building a survival horror game on Roblox.

The first lesson concerns Rojo's path structure, and it catches nearly everyone.

When you create a folder structure in your filesystem, Rojo maps it to the Roblox instance hierarchy. A folder named Services containing TerrainGenerator.luau seems straightforward. The intuition says: script is in Services, so I require it via script.Services.TerrainGenerator.

This intuition is wrong.

In Rojo, the folder becomes a sibling of your script, not a child. Your Main.server.luau and your Services folder sit at the same level in the hierarchy. To require TerrainGenerator, you write script.Parent.Services.TerrainGenerator. The Parent brings you up to the container, then you traverse into Services.

This trips up AI-generated code constantly. The AI knows Luau syntax perfectly well, but it applies file system intuitions that don't map to Rojo's behavior. Every time you set up a new module structure, verify the require paths manually. Write a test that simply attempts to require each module and prints success. Run it once. Fix the paths. Move on knowing they're correct.

The second lesson involves a more subtle trap: Luau is not dotnet.

If you've written C# or other .NET languages, certain methods feel natural. Object.GetHashCode for unique identifiers. Object.ToString for string representation. Object.Equals for comparison. These methods don't exist in Luau.

The AI, trained on code from many languages, sometimes generates these patterns. The code looks reasonable. It might even seem to work in certain cases due to how Luau handles undefined method calls. But it will fail unpredictably when you least expect it.

For hash-like unique identifiers, Luau offers a workaround. The tostring function applied to any Roblox instance produces a string containing a hexadecimal identifier. You can extract this with pattern matching: tostring(object):match("%x+$") gives you a unique-ish string. Not cryptographic, but sufficient for distinguishing instances within a game session.

For string conversion, tostring works directly. For equality comparison, use the double equals operator. Simple, once you know—but the AI doesn't always know without explicit guidance.

The third lesson appears in unexpected places: Luau's parser struggles with certain syntax patterns.

Consider this sequence: you create a tween, call Play on it, then on the next line you cast a variable and access a property. The parser sees the opening parenthesis and becomes confused. Is this a function call with the previous expression? Is it a new statement? The ambiguity causes errors.

The fix is a semicolon before the ambiguous line. This explicit statement termination tells the parser that the previous expression has ended. You'll see this pattern: methodChain():Play() followed by ;(someVariable :: SomeType).Property = value. The semicolon prevents the ambiguous syntax error.

Region3 alignment presents the fourth lesson, specifically regarding terrain manipulation.

When you create a Region3 for operations like FillRegion, Roblox requires alignment to the voxel grid. An unaligned region produces an error about grid alignment. The fix is simple but essential: call ExpandToGrid(4) on your Region3 before passing it to terrain methods. The 4 represents the voxel resolution.

Without this, your procedural terrain generation fails at runtime. With it, regions snap to valid boundaries and operations succeed. Every terrain-related Region3 should include this call.

The fifth lesson involves network performance: RemoteEvent throttling.

In a horror game, you constantly update the client about creature positions, player status, environmental changes. The temptation is to send updates every frame. The server knows where creatures are, so it fires events to clients in Heartbeat callbacks. Sixty events per second per data type.

This overwhelms the client's event queue. You receive an error about the invocation queue being exhausted. The game stutters. The fix involves throttling: track when you last sent each type of update, and only send again after a configurable interval. One second for non-critical updates like resource counts. A quarter second for creature positions. You can still send immediately when something critical changes—a creature spotted the player—but routine updates should throttle.

The sixth lesson emerged from Roblox's audio privacy changes.

Roblox restricted how games access audio assets. Many sounds require explicit permission from the asset owner. If you try to play an audio asset without permission, you get errors about failed loads. Even setting a SoundId to a zero value causes issues.

The solution is defensive: don't create Sound objects at all if you lack valid audio. Check the SoundId before construction. Return nil from functions that would create invalid sounds. Handle nil throughout your audio system. For ambient sounds and music, use either your own uploaded assets or specifically licensed sounds from the Creator Marketplace.

VehicleSeat versus regular Seat provides the seventh lesson for any game with mounts or vehicles.

A regular Seat keeps the player attached but provides no movement input. A VehicleSeat exposes Throttle and Steer properties that reflect player input. If you want players to control a creature they're riding—a mount in your horror setting, perhaps—VehicleSeat is required.

Read the Throttle value in a Heartbeat connection. Map it to Humanoid:Move or directly to AssemblyLinearVelocity. The player's input flows through the standard vehicle controls without you building custom input handling.

The eighth lesson addresses architectural discipline: single source of truth for terrain.

In procedural games, terrain height matters constantly. Creatures need to walk on terrain. Objects spawn at correct heights. The player's position depends on the ground beneath them. Every system that places anything needs to query terrain height.

The trap is calculating height in multiple places. Each calculation might drift slightly. One system uses a seed of 42, another uses 43. One applies noise at a certain frequency, another applies different parameters. Objects float or sink because their height calculation doesn't match the actual terrain.

The solution is brutal simplicity: one function calculates height. Shared.getTerrainHeight(x, z) is the only authority. Every system imports this function. When you need to change terrain generation, you change it in one place. Consistency becomes automatic rather than aspirational.

This leads to the ninth lesson: heightmap architecture for performance and reliability.

Calculating terrain height through noise functions takes time. When placing dozens of objects at startup, calling expensive noise functions repeatedly slows initialization. Worse, if the terrain hasn't finished generating when you place objects, they might fall through nothing.

The solution separates heightmap generation from visual terrain generation. At startup, generate a heightmap—a fast, deterministic lookup table of heights. This completes quickly and becomes immediately queryable. Only then generate the actual visual terrain, which can happen asynchronously in the background. Objects that spawn use the heightmap, not the visual terrain, for their heights.

The practical result: objects never fall through ungenerated terrain, because the heightmap existed before they spawned. The game can start handling player interactions while the visual terrain fills in progressively.

These nine lessons share a common thread: they represent mismatches between intuition and reality.

The file system maps to the instance hierarchy, but not how you expect. Luau resembles other languages, but lacks their methods. Syntax that looks unambiguous isn't. APIs that seem straightforward have hidden requirements. Performance that seems acceptable hits limits under load. Audio that seems available isn't. Input that seems obvious requires specific component choices. Calculations that seem consistent diverge. Operations that seem cheap become expensive.

Vibe coding doesn't protect you from these mismatches. In some ways it exposes you to them faster, because you're generating more code more quickly. The AI might produce code that triggers these edge cases on the first generation.

What vibe coding does enable is rapid recovery. When you hit one of these lessons, you can describe it to the AI explicitly. "Rojo uses parent-sibling structure, not parent-child. Rewrite the requires." The AI adjusts. Your next generation avoids that mistake. You accumulate knowledge, document it in your CLAUDE.md or equivalent, and future development becomes smoother.

The horror game benefits specifically from this accumulation. Atmosphere depends on many systems working together—creatures, lighting, sound, terrain, UI. Each system has its own potential pitfalls. By the time you've navigated them all, you have a game that works reliably, that doesn't stutter or error in front of players. The creeping dread you design isn't interrupted by technical failures.

These patterns aren't exhaustive. Your specific game will discover its own. Document them as you go. Build tests that catch regressions. Treat each lesson as an investment in future development speed.

The terror should come from your creatures, not your code.
