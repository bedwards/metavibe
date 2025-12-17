# The Difference Between Working and Finished

A game that functions is not the same as a game that shines. The gap between working prototype and polished release contains countless small decisions—audio levels, animation timing, feedback clarity, visual coherence. None of these individually matter much. Together, they determine whether players feel like they're experiencing something professional or something amateur.

Polish is where vibe coding faces its most interesting challenge. AI assistants excel at generating functional systems. Describing "create a health bar that displays current player health" produces something that works. But describing the feel of that health bar—the way it should throb at low health, the sound it should make when depleted, the way losing health should affect screen clarity—requires understanding the emotional experience you're creating.

Horror polish specifically aims at sustaining dread. Every element of your game should contribute to or at least not undermine the atmosphere you've built. A playful sound effect, an overly bright UI element, a jarring font choice—these break the spell. Polish means auditing everything for tonal consistency.

User interface in horror games faces a fundamental tension. Players need information to make meaningful decisions—health, stamina, inventory, objectives. But information displays pull attention from the game world toward abstract representations of game state. Heavy UI creates distance between player and experience.

The solution is what designers call diegetic UI—interface elements that exist within the game world rather than overlaid on it. The classic example is Dead Space, where the player's health displays as a glowing bar on their character's spine. You check your health by looking at your character, not at a corner of the screen.

In Roblox horror, purely diegetic UI is difficult, but you can move in that direction. Health might be represented by visual effects on the player's view—reddening edges at low health, desaturation as damage accumulates, blurring at critical levels. These effects exist within the game rather than commenting on it from outside.

When UI elements must exist—inventory screens, objective displays, interaction prompts—minimize their visual footprint. Small fonts. Muted colors. Transparency that lets the game world show through. The UI should feel like whispered information, not a billboard.

We discovered that UI animations affected horror feel more than we expected. A health bar that updates instantly feels mechanical. A health bar that drains smoothly, especially one that seems to hesitate before major drops, creates anticipation even in an abstract display. Animation gives UI elements weight.

Audio polish separates amateur games from professional ones more than any other element.

Players forgive rough graphics. They won't forgive bad audio. Sounds that are too loud or too quiet, audio that clips or cuts off abruptly, music that doesn't fit the mood—these problems pull players out of the experience immediately.

Footstep systems deserve particular attention. Every step the player takes produces sound. In horror, those sounds should feel meaningful. Different surfaces should sound different—metal grating distinct from concrete flooring, wood creaking under weight, water splashing when you walk through puddles. This variety makes the environment feel physical rather than abstract.

We implemented what we called audio layering for ambient soundscapes. Rather than one continuous ambient track, we created multiple layers that play simultaneously. A base drone provides constant low-frequency rumble. An environment layer adds location-specific sounds—mechanical hum in industrial areas, dripping water in flooded sections. A tension layer grows as threat increases—subtle heartbeat, dissonant tones, increasing frequency. These layers crossfade based on game state, creating dynamic audio that responds to player situation.

Sound positioning matters enormously for horror. A sound from behind you creates immediate tension. A sound from above suggests something you haven't seen. Roblox's spatial audio handles this well, but you need to configure sounds to use it properly. Sounds that should have physical presence in the world need roll-off settings that make them quieter with distance. Sounds that represent internal states—heartbeat, breathing—should be non-positional.

Visual polish extends beyond UI into every graphical element.

Lighting consistency means your carefully designed atmosphere remains consistent across the game. Bright spots that shouldn't exist, dark areas that feel arbitrary, color temperatures that shift between areas without reason—these break the visual coherence that sustains mood.

Particle effects can enhance or destroy atmosphere depending on execution. Dust motes in light beams create depth and physicality. Fog that responds to movement makes the environment feel reactive. But effects that are too prominent or too colorful draw attention to themselves rather than serving the experience.

We found that visual polish often meant removal rather than addition. The first pass on a horror game tends to add effects—more particles, more post-processing, more visual activity. Subsequent passes should question each addition: does this serve the horror? Often the answer is no, and removing the effect improves the experience.

Performance polish is invisible to players but defines whether your game feels smooth or stuttery.

Horror depends on player immersion. Frame rate drops break immersion instantly. The player stops experiencing the horror and starts experiencing the game as a technical artifact. Maintaining consistent performance is therefore essential even though players never consciously appreciate it.

Roblox's streaming system helps with large maps. Rather than loading everything at once, the engine loads content as players approach it. Configuration for streaming involves balancing load radius against visual pop-in—you want content loaded before players can see it but not so much content that the load becomes expensive.

Raycasting efficiency matters for horror games because many systems use raycasts: detection systems checking whether the creature can see the player, sound propagation checking for walls between noise sources and listeners, flashlight systems determining what the beam illuminates. Each raycast has cost. Batching raycasts, caching results where appropriate, and avoiding redundant calculations keeps performance smooth.

We developed a performance testing protocol: play through the entire game while monitoring frame rate. Note where drops occur. Investigate those specific areas for expensive operations. Often the issue is obvious once you look—a loop that runs every frame when it should run occasionally, a calculation that could be cached, a visual effect that's more complex than necessary.

Testing before publication catches issues that development blindness hides.

After building a game for weeks or months, you know it intimately. You know where to go, what to do, how systems work. Players don't have this knowledge. Things that seem obvious to you might be completely unclear to them.

Playtesting with fresh eyes reveals these blind spots. Watch players who haven't seen your game before. Where do they get confused? Where do they miss obvious interactions? Where do they do something you didn't anticipate? Each observation suggests polish work.

Horror games have specific testing needs. Does the creature feel scary? Do quiet moments still feel tense? Does the ending satisfy? These questions can't be answered by checking functionality—they require experiential evaluation that only actual play provides.

We kept a testing checklist: all objectives completable, all items interactable, all doors functional, creature behavior consistent, multiplayer sync working, performance acceptable across target devices. Running through this checklist before each significant update prevented embarrassing bugs from reaching players.

Publishing on Roblox requires understanding the platform's discovery systems.

Your game competes with millions of others. Discovery depends on multiple factors: game quality, thumbnail appeal, description clarity, player retention, and social sharing. A great game with poor presentation won't be found. A mediocre game with perfect marketing might find players but won't retain them.

Thumbnails and icons deserve significant attention. These are often the only impression potential players have before deciding whether to try your game. Horror thumbnails should communicate atmosphere—darkness, tension, threat suggested rather than shown. They should also be visually distinctive enough to stand out in browse lists.

Descriptions need to communicate quickly. What is this game? What makes it different? What can players expect? Horror game descriptions should hint at experience without spoiling it. "Survive the night in an abandoned facility" communicates more about gameplay than "my scary game please play it."

Genre tagging affects discovery. Horror games should be marked as Horror—obvious but important. Relevant additional tags help players with specific interests find your game. Multiplayer tags matter if your game supports it.

Monetization requires ethical consideration especially for horror games.

Horror works through emotional manipulation—creating fear, then relief, then fear again. Monetization schemes that exploit these emotions feel predatory. Selling safety, selling advantages against the creature, selling escapes from danger—these cheapen the experience and feel wrong.

Ethical monetization for horror games focuses on cosmetics and expansion. Players might pay for character customization that doesn't affect gameplay. They might pay for additional maps or creatures. Private servers let friend groups play together without strangers. These monetization approaches add value without undermining the horror experience.

We avoided any monetization that affected survival probability. No purchased healing items, no bought advantages against the creature, no pay-to-win elements. Players should succeed or fail based on skill and luck, not wallet size.

Post-launch work often exceeds pre-launch work.

The game that launches is not the game that endures. Player feedback reveals issues you didn't anticipate. Usage patterns show which content gets played and which gets ignored. Community requests suggest features you hadn't considered.

Bug fixing takes priority. Nothing damages a game's reputation faster than prominent bugs. Players who encounter bugs might not return. Each bug fix improves retention, which improves visibility, which brings more players.

Balance adjustments come from observing actual play. The creature might be too easy once players learn patterns. Resource spawns might be too generous or too stingy. These values need adjustment based on data rather than designer intuition.

Content updates keep players coming back. New maps, new creatures, new objectives, new items—each update gives players reason to return and experience something fresh. The most successful Roblox games update frequently, treating launch as beginning rather than ending.

Community building sustains games beyond updates.

Players who feel connected to a game's community remain engaged longer than players who experience the game in isolation. Discord servers, Roblox groups, social media presence—these create spaces for players to discuss, share, and anticipate.

Responding to player feedback, even when you can't act on it, demonstrates that someone cares about the experience. Players who feel heard become advocates. They bring friends, defend the game in discussions, spread awareness.

The community also catches bugs faster than any testing process. Thousands of players exploring your game find edge cases you never imagined. Making it easy for players to report issues helps you improve the game faster.

Vibe coding carries through every phase of polish and publication.

Describing desired effects to AI assistants works as well for polish as for core systems. "Create screen shake that responds to damage intensity, with high damage causing larger shake that decays over time." "Implement footstep sounds that vary based on floor material, with different volumes for walking versus running." "Build a thumbnail generation system that captures the game at dramatic angles with appropriate lighting."

The iterative pattern remains: describe intent, see result, refine toward vision. Polish iterations are smaller than core system iterations—adjusting animation timing rather than rebuilding animation systems—but the process is the same.

Your horror game is now complete. From project setup through creature AI, from atmospheric lighting through multiplayer systems, from polish to publication—you've built something that can terrify players.

But remember: the systems aren't the horror. The horror is the experience those systems create. Keep playing. Keep tuning. Keep asking whether each element serves the fear you're trying to generate.

When players share their terrified reactions, their close calls, their failures and triumphs—when they bring friends to experience what scared them—you'll know you've built something worthwhile.

Now go make something that haunts people.
