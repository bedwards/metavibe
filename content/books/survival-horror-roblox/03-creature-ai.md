# The Thing That Hunts

Every horror story needs an antagonist. In survival horror games, that antagonist typically takes physical form—something that exists in the game space, that moves through corridors you're exploring, that might be around any corner. The creature.

Building effective creature AI sits at the intersection of technical programming and psychological manipulation. You need systems that work reliably—pathfinding that doesn't break, detection that behaves consistently, state management that doesn't produce bizarre behaviors. But technical correctness is table stakes. The creature must also feel intelligent, feel threatening, feel like a genuine presence rather than a script executing.

This distinction matters for vibe coding because AI assistants can produce technically correct creature behavior almost instantly. Ask for a state machine with patrol, investigate, and chase states, and you'll get working code. The challenge lies in tuning that behavior until it creates fear rather than merely creating challenge.

The traditional game development approach to creature AI starts with what designers call a behavior tree or state machine—a formal structure describing what the creature does under various conditions. When no player is detected, patrol between waypoints. When a sound is heard, move toward the sound and search. When a player is seen, give chase. When close enough, attack.

This structure works, and AI assistants generate it easily. But pure state machines produce predictable behavior. Players quickly learn the patterns. After three encounters, they know exactly how long the creature searches before giving up, exactly how far they need to run before it loses interest. The creature becomes a puzzle to solve rather than a threat to fear.

The first technique we discovered was what we called intentional imperfection.

Real predators aren't optimally efficient. They get distracted. They miss obvious cues. They double back on paths they just traveled. These inefficiencies actually make them scarier because they're unpredictable. You can't count on the creature taking the optimal route, so any route might be the one it takes.

When communicating this to AI assistants, we found that describing the intended player experience worked better than describing implementation. Rather than "add random delays to the chase behavior," we prompted: "The creature should feel believable rather than optimal. Sometimes it should pause as if listening. Sometimes it should search areas the player already left. The player should never feel completely certain about where the creature will go next."

This prompt produces behavior variations that serve the horror goal rather than arbitrary randomness. The AI understands that uncertainty creates tension and generates appropriate variation.

Detection systems deserve careful attention because they define the core loop of gameplay.

In most horror games, players alternate between two modes: exploring when safe, avoiding when threatened. The transition between modes—the moment the creature detects you—carries enormous emotional weight. If detection feels unfair, players become frustrated. If detection feels too avoidable, tension dissipates.

We found that layered detection created the best player experience. Sight detection works as you'd expect—if the creature can see you, it knows where you are. But sight alone means safety exists anywhere out of view, which undercuts horror's fundamental uncertainty about what lurks unseen.

Sound detection adds the crucial dimension. Players making noise—running, opening doors, interacting with objects—create detection opportunities even when hidden from sight. This creates meaningful choices. You can move faster but risk detection, or move slowly and carefully but spend more time in dangerous areas.

The technical implementation of sound detection involves calculating player noise levels based on actions and checking whether those noises exceed thresholds at the creature's location. AI assistants handle this calculation easily. The design question is how generous or punishing to make the system.

We discovered that transparency helped significantly. When players understand how detection works, they feel agency over their fate. When a creature hears them, they know why—they chose to run. When detection feels random or inexplicable, horror becomes frustration.

One prompt that produced excellent results: "Create a detection system where players can intuit the rules through play. Running should clearly be louder than walking. Environmental sounds should mask player sounds when present. Give visual or audio feedback when the creature is listening or suspicious, so players can adjust their behavior."

This prompt generates detection with clarity. Players learn through experience what actions are safe and what risks detection. The horror comes from choosing to take risks, not from arbitrary punishment.

The creature's response to detection matters as much as detection itself.

Immediate chase upon any detection produces exhausting gameplay. Players spend entire sessions running, which quickly loses tension. But slow response to detection makes the creature feel stupid, which undercuts fear.

The technique we settled on uses what we called alert escalation. The creature has multiple awareness states—unaware, suspicious, alert, hunting. Detection triggers transition between states rather than immediately starting chase. A single noise makes the creature suspicious. It pauses, perhaps turns toward the sound, but doesn't immediately pursue. Continued noise or visual contact escalates to alert, where the creature actively investigates. Confirmed player detection escalates to hunting, the full chase state.

This escalation creates narrative moments. Players hear the creature pause. They freeze, hoping it didn't notice. The creature moves toward their position. They have seconds to decide—hide or flee? These moments are horror gold, and they emerge from the structure of the detection system rather than scripted sequences.

Communicating alert escalation to AI assistants requires describing the pacing intent. "The creature shouldn't immediately chase upon detecting the player. There should be a progression: first suspicion, where it pauses and looks around; then investigation, where it moves toward the last known location; then pursuit if it confirms player presence. Each stage should give players a brief window to respond."

Pathfinding presents its own challenges in horror contexts.

Roblox provides PathfindingService, which calculates routes through navigable spaces. AI assistants integrate this service readily. But raw pathfinding optimizes for shortest routes, which again creates predictability. Players learn which paths the creature never takes and feel safe there.

We experimented with what we called territorial awareness—the creature develops familiarity with its environment and preferences about where to patrol. Certain rooms feel more like "its space." Its presence there feels natural in a way that feels like hunting elsewhere. This creates geography of danger that players can learn and use strategically.

Implementation involves giving the creature preferred patrol routes and having it gravitate toward those routes between active pursuits. When searching for a lost player, it might check its familiar areas first. This produces creature behavior that feels like a presence rather than an algorithm.

The most effective horror technique we discovered was presence without pursuit.

Game designers call this the "glimpse"—the moment when players see the creature but the creature doesn't see them. Or the moment when players realize the creature is close but facing away, and they might sneak past. These moments create intense tension because they give players time to feel afraid without immediately forcing action.

Building glimpse moments requires the creature to sometimes move through spaces without detecting players who are carefully hidden or lucky. It requires the creature to occasionally stand still, letting players observe it. It requires moments where the creature is present but not hunting.

We prompted for this directly: "The creature should sometimes stand at the end of a hallway, not moving, as if waiting. It should sometimes move through an area while players hide nearby, passing without detecting them if they remain still and silent. Players should have opportunities to watch the creature without being watched back."

The AI generates behavior that includes pause states and detection thresholds that allow careful players to observe. These moments become the horror memories players share—the time they saw it standing at the end of the corridor, the time they hid under a desk while it walked past.

Balancing creature lethality requires understanding what you want death to mean.

If the creature kills instantly upon contact, encounters are binary—escape or die. This can work but creates a particular pacing where most gameplay involves avoiding encounters entirely. Doom becomes background noise because any encounter ends the same way.

If the creature damages but doesn't instantly kill, encounters become more complex. Players might fight back, might survive wounded, might make desperate decisions. Health becomes another resource to manage.

The choice depends on your horror goals. We found that for first-time players, forgiving encounters help them learn systems without constant restarts. For experienced players, punishing encounters maintain tension that familiarity otherwise erodes. Some games adjust difficulty dynamically, becoming more forgiving when players are struggling and more punishing when players are succeeding.

Vibe coding creature AI benefits from iterative conversation.

The first implementation will be functional but probably not scary. It will chase effectively but predictably. The prompts that follow tune toward fear: "The creature feels too easy to predict—what variations would make it less readable?" Or: "Players are escaping too consistently—what changes would increase catch rate without feeling unfair?" Or: "The creature never feels truly present—what behaviors would make it feel like it inhabits this space?"

These iterative prompts refine behavior toward horror rather than just functionality. Each adjustment based on playtesting brings the creature closer to genuinely threatening.

We discovered that creature AI connects to everything else we'd built. The atmosphere systems respond to creature proximity, so the lighting darkens and sounds shift when it's near—reinforcing the creature's presence before players see it. The survival mechanics create stakes for encounters—wounded players move slower, running drains stamina needed for escape. The environment provides hiding spots and escape routes that make the creature's detection meaningful.

Horror games work as integrated systems. The creature gains menace from its context. A creature that hunts through brightly lit, safe-feeling spaces seems almost silly. A creature that emerges from fog, that causes lights to flicker as it approaches, that appears suddenly in spaces you thought were safe—that creature terrifies.

The next chapter covers survival mechanics—the systems that give players agency within the horror. Health, stamina, resources. These mechanics determine what players can do when the creature appears, which determines how encounters feel. The creature matters because avoiding it matters. Survival mechanics are what make avoidance meaningful.
