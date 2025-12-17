# The Toolsmith's Foundation

Before the first creature stalks its first corridor, before the fog rolls in and the lights flicker, you need infrastructure. Not the exciting kind—no jump scares here, just the scaffolding that makes everything else possible. This chapter might seem dry. Bear with it. The decisions you make in project setup compound throughout development.

Roblox Studio works fine for small projects. You click around, create scripts directly in the editor, test by hitting play. Many successful games started this way. But as complexity grows, Studio's limitations emerge. The built-in script editor lacks modern features. There's no version control integration. Collaboration means passing place files around or using Roblox's team create, which has its own quirks.

Most critically for vibe coding: AI assistants can't see inside Roblox Studio. They work with files on your filesystem. If your code lives only in Studio, you're copying and pasting constantly, losing context, fragmenting the conversation.

This is where Rojo enters the picture.

Rojo bridges the gap between your filesystem and Roblox Studio. Scripts live as plain text files—Luau code with the extension that signals their purpose. A server script ends in server.luau. A client script ends in client.luau. Shared modules end simply in luau. You edit these files in whatever environment you prefer, and Rojo synchronizes changes into Studio in real time.

The practical implication is profound. Your horror game becomes a folder of text files. You can track changes with Git. You can review code in pull requests. Multiple developers can work simultaneously. And your AI assistant can read and modify any script by working with the files directly.

Installing Rojo takes a few minutes. The Roblox developer community has converged on Aftman as the standard tool manager—think of it as npm or cargo for Roblox tooling. One configuration file lists the tools you need, and Aftman ensures the correct versions are installed. You'll want Rojo for synchronization, Wally for package management if you use external libraries, Selene for linting, and StyLua for consistent formatting.

When we first set up a Roblox project for vibe coding, we discovered something unexpected about how to communicate with AI assistants about structure.

The naive approach—"create a project structure for a horror game"—produces generic results. The AI generates something functional but without opinion. You get folders named src and assets with placeholder content.

The better approach describes intent alongside structure. "I need client-server separation where the server handles creature AI and game state while the client handles player input and UI. Shared modules should define constants that both sides reference." This prompt conveys not just what you want but why, which helps the AI make better decisions about what goes where.

We found an even better approach: describe a specific scenario and let the AI infer structure from behavior. "When a player makes noise, the server should evaluate whether any creatures can detect it. If so, the creature's behavior state should change, and the client should receive updates about the creature's new position. What project structure supports this cleanly?"

This kind of prompt treats the AI as a collaborator rather than a code generator. You're thinking together about architecture. The resulting structure reflects actual gameplay needs rather than generic best practices.

The core architectural pattern in Roblox deserves understanding even if AI handles the details.

Server scripts run on Roblox's infrastructure. They have authority over game state. When the server says a creature is at a particular position, that's where the creature is. Clients can request actions, but the server decides whether those actions succeed. This matters for horror games because you need to control what players see. If a creature lurks behind a door, only the server knows this. The client receives information when appropriate—when the door opens, when the creature enters detection range.

Client scripts run on each player's device. They handle input and rendering. When a player presses a key, the client script processes that input and may send a request to the server. The client also renders the game world, plays sounds, and displays UI. For horror, client scripts manage the moment-to-moment experience—the creaking sound when you walk past a certain spot, the slight camera shake during tense sequences, the darkness effect when your flashlight battery dies.

Shared modules contain code that both server and client need. Type definitions, constants, utility functions. In a horror game, these might include configuration values for creature detection ranges, stamina drain rates, lighting parameters. Having these in one place means consistency—when you adjust a value, both sides see the change.

The structure we settled on through iteration separates concerns cleanly. Server scripts handle game logic, creature behavior, and state management. Client scripts handle input processing, UI rendering, and local effects. Shared modules define the constants and types that keep everything coherent.

What about assets? Models, sounds, textures—the visual and auditory elements that make horror visceral. Rojo can sync these too, but we found it more practical to manage them directly in Studio. The large binary files don't version control gracefully. More importantly, placing and adjusting assets benefits from Studio's visual tools. The code-based workflow excels for logic; Studio excels for spatial design.

One discovery surprised us repeatedly: vibe coding thrives when you establish conventions early.

In traditional development, conventions emerge organically. You write code, notice patterns, refactor toward consistency over time. With vibe coding, the AI generates code rapidly. Without clear conventions, each generation might follow different patterns. Your codebase becomes a patchwork.

The solution is to establish conventions explicitly at the start. Not through documentation—through code. Write one example of how server scripts should initialize. Write one example of client-side event handling. Then tell the AI: "Follow the patterns established in the existing code." The AI reads those examples and extends them consistently.

For our horror project, the initialization pattern became a touchstone. Every server script starts by importing required services, then establishes any listeners, then performs any startup logic. Every client script starts by acquiring references to player elements, then sets up input handlers, then initializes any local state. The AI maintained these patterns once established, producing code that felt cohesive rather than generated.

Git integration deserves mention, though it's not Roblox-specific.

Version control transforms how you work with AI assistants. Every change becomes reversible. You can try an experimental approach, see if it works, and easily revert if it doesn't. This safety net encourages bolder experimentation. When the AI suggests a significant refactor, you can accept it without fear—if something breaks, the previous state is always recoverable.

We developed a rhythm: make a logical change, test it, commit if it works. Small, frequent commits rather than large batches. Each commit message describes what changed and why, creating a narrative of development. Later, when something breaks, this history helps diagnose what went wrong.

The combination of Rojo, Git, and AI assistance creates something greater than its parts. Files live on your filesystem where AI can access them. Changes sync instantly to Studio where you can test. Git tracks everything, enabling bold experimentation. The cycle from idea to implementation to testing to iteration becomes remarkably fast.

This matters for horror games specifically because atmosphere requires tuning. The right fog density, the precise distance at which footsteps become audible, the exact speed at which a creature patrols—these values need adjustment based on feel rather than specification. When adjustment is cheap, you can tune toward genuine creepiness rather than settling for approximately scary.

Before we move on, let's address something the tooling doesn't solve: taste.

No project structure makes your game fun. No AI assistant understands what frightens your specific audience. The infrastructure we've discussed enables rapid iteration, but iteration toward what? You need a vision. You need to play horror games and notice what works. You need to understand why certain sounds unsettle and others don't register.

The tooling amplifies your judgment. If your judgment is good, vibe coding lets you manifest it quickly. If your judgment is undeveloped, you'll produce mediocre work faster. This book focuses on techniques, but techniques serve vision. Cultivate your sense of what makes horror work, and the techniques will serve you well.

The next chapter dives into atmosphere—lighting, sound, environmental design. These are the elements that transform a Roblox place from a collection of parts into a space that generates dread. The project structure we've established here provides the foundation; now we build something worth being afraid of.
