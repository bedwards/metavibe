# The Weight of Every Choice

Horror without consequences is haunted house theater—startling but ultimately safe. You walk through scares knowing nothing can actually happen to you. Survival mechanics provide the consequences that transform spooky environments into genuine ordeals. When health is limited, when resources are scarce, when every decision carries risk, the emotional stakes compound.

The earliest survival horror games understood this intuitively. Resident Evil rationed ammunition so severely that players agonized over every shot. Silent Hill's radio crackled when enemies approached, creating anticipation that made encounters feel dangerous even before they began. These games succeeded not because their mechanics were complex but because those mechanics created meaningful scarcity.

Vibe coding survival mechanics presents an interesting challenge. AI assistants can generate health systems, inventory systems, and resource management instantly. The code is straightforward—variables that track values, functions that modify them, UI that displays current state. What can't be automated is the tuning that makes those systems feel right.

Too much health and players stop caring about damage. Too little and frustration overwhelms fear. The same tension applies to every resource: stamina, batteries, ammunition, healing items. The sweet spot exists where players constantly feel slightly underpowered but never hopeless.

Let's examine how each major system contributes to survival horror and how to communicate tuning goals to AI assistants.

Health in survival horror differs fundamentally from health in action games. Action game health regenerates or replenishes easily—the system exists mainly to gate players from rushing through content. Survival horror health should feel precious. Losing health should feel like a meaningful setback that persists.

This means healing should be limited. Medical supplies exist but are never abundant. Finding a first aid kit feels like relief rather than routine. Using that kit on a minor wound raises difficult questions—do you heal now when you're only slightly injured, or save the kit for a potentially worse future situation?

The technique we found most effective was what we called scarring encounters. Some damage heals fully with treatment. Other damage leaves lasting effects—reduced maximum health, slower movement, impaired vision. These lasting effects accumulate across a session, creating the sense that the environment is wearing you down even when individual encounters seem survivable.

Communicating this to AI assistants requires describing the emotional arc you want. "Health should feel meaningful. Healing items should be rare enough that players seriously consider whether to use them. Some damage types should have lasting consequences that persist even after healing—maybe a limp that slows movement, or blurred vision that clears gradually. Players should end sessions feeling like survivors of an ordeal, not heroes who shrugged off challenges."

Stamina systems create moment-to-moment tension in a way health systems can't.

Health decisions happen occasionally—when you find healing items, when you decide whether to engage or avoid an enemy. Stamina decisions happen constantly. Every sprint depletes stamina. Every swing of a weapon drains it. Players must continuously evaluate whether they have enough stamina for the action they're considering.

Running from a creature should feel desperate. Players should watch their stamina bar drop and feel genuine anxiety about whether they can reach safety before exhaustion forces them to slow down. This creates chase sequences that feel harrowing rather than routine.

The key to effective stamina design is what we called exhaustion consequences. When stamina depletes fully, players shouldn't simply be unable to run—they should be visibly impaired. Heavy breathing that might attract the creature. Slowed walking that makes escape harder. Blurred screen edges that reduce awareness. Exhaustion should feel like a crisis.

Recovery should also feel meaningful. Standing still regenerates stamina faster than walking. Finding a safe room might restore stamina fully. These mechanics reward careful play—players who manage stamina well maintain options, while players who sprint constantly find themselves vulnerable at critical moments.

Inventory systems transform resource management into physical puzzle.

Limited carrying capacity forces choices. You can't collect everything. When your inventory fills, you must decide what stays and what gets left behind. These decisions create personal narratives—the healing kit you dropped to carry a key item, the weapon you couldn't fit that would have been perfect for the next encounter.

Weight-based inventory adds nuance beyond simple slot limits. Heavy items impose tradeoffs—you might carry them but move slower, or leave them but move freely. This creates interesting decisions about expedition loadouts. Do you travel light for speed and stealth, or heavy for preparedness?

We found that item categories helped make inventory decisions cleaner. Tools remain equipped and don't consume slots. Consumables stack but take space. Key items occupy dedicated slots that can't be used for anything else. This structure means players always have room for essential plot items but must manage their consumable supplies.

Crafting extends resource management into experimentation and creativity.

Basic crafting lets players transform found materials into useful items. Cloth and alcohol become bandages. Wood and oil become torches. Wire becomes lockpicks. These recipes give purpose to otherwise mundane pickups and reward thorough exploration.

The design question for crafting is how generous to make it. In some games, crafting materials are common and recipes are the limiting factor—players craft frequently and consider it a core system. In others, materials are rare and crafting is a special occasion—producing a single item feels like an achievement.

For survival horror, we found that moderate scarcity worked best. Crafting should feel possible but not trivial. Players should discover recipes through play and feel clever when they produce useful items. But crafting shouldn't become the focus of gameplay—it should supplement survival, not define it.

The flashlight mechanic deserves special attention because it epitomizes survival horror design.

A flashlight provides exactly what horror denies—visibility. When your flashlight works, the darkness loses some power. You can see what's ahead. The unknown becomes known. This makes flashlight management emotionally significant in a way that other resources aren't.

Battery drain creates continuous tension. The flashlight always works—until it doesn't. Players watch the battery level drop and wonder whether they should conserve power or maintain visibility. Turning off the flashlight voluntarily feels brave. Having it die unexpectedly feels catastrophic.

Low battery behaviors amplify this tension. Flickering light at low power warns that darkness approaches. The flicker itself disturbs—the strobing effect makes shadows seem to move. When the battery finally dies, the sudden darkness hits harder because players had those warning signs and couldn't prevent the outcome.

Battery pickups become precious. Finding batteries feels like finding safety. Using batteries feels like buying time. The simple mechanic of light and darkness gains emotional weight through resource scarcity.

We discovered that communicating these emotional goals to AI assistants produced better systems than describing technical implementations. Rather than "flashlight drains at 5% per second and flickers below 20%," we prompted: "The flashlight should feel like a lifeline. Battery drain should be slow enough that players can complete exploration objectives but fast enough that they can't keep the light on indefinitely. Low battery should feel like approaching doom—flickering, unreliable light that players desperately want to restore."

The AI generates appropriate drain rates and behaviors because it understands what the system should feel like. The numbers come out differently than if we'd specified them, but the feel matches our intent.

Optional systems extend survival mechanics for players who want deeper challenge.

Hunger and thirst add long-term resource pressure. Even when moment-to-moment survival seems stable, players must plan for sustenance. This works well for longer-form games where sessions span days of in-game time. For shorter experiences, these mechanics often feel like busywork—adding complexity without adding fun.

Sanity systems let horror affect players beyond physical health. Witnessing terrible things, spending time in darkness, encountering the creature—these might drain sanity. Low sanity could produce hallucinations, unreliable information, impaired decision-making. This system works thematically for Lovecraftian or psychological horror but requires careful implementation to avoid feeling arbitrary.

Temperature systems force players to manage environmental exposure. Cold areas drain warmth; players must find heat sources or wear appropriate clothing. This works well for outdoor survival horror—frozen wastelands, harsh winters—but adds complexity that may not serve tighter, interior-focused experiences.

The key question for any optional system: does it enhance the horror? If managing hunger makes players feel desperate and vulnerable, include it. If it just means clicking "eat" periodically, skip it. Mechanics should serve emotion, not exist for their own sake.

Balancing survival mechanics requires playtesting and iteration.

The numbers you start with won't be right. They never are. Health regeneration rates, stamina drain speeds, item spawn frequencies—all of these require adjustment based on how actual players experience your game.

Vibe coding accelerates this iteration. Instead of manually adjusting values and rebuilding, you describe what feels wrong and let the AI suggest corrections. "Players are never running out of batteries—how can we increase scarcity?" Or: "Combat feels too punishing—health drops too fast for players to escape. What changes would give more survivable encounters while maintaining tension?"

The AI proposes changes. You test them. You describe the new feel. The conversation continues until the experience matches your vision.

We developed a useful heuristic for survival balance: players should feel relief when they find resources and anxiety when they use them. If finding a medkit feels routine, you have too many. If using a medkit feels wasteful, healing might be too precious. The emotions guide the numbers.

These survival mechanics connect to everything else in your horror game. The creature feels threatening because players have limited resources to survive encounters. The atmosphere feels oppressive because resources needed to survive that atmosphere are scarce. The environment rewards exploration because exploration yields survival resources.

The integration matters more than any individual system. A health system in isolation is just a number. A health system connected to rare healing items, dangerous encounters, and persistent consequences becomes central to how players experience your game.

The next chapter covers environment design—the physical spaces where survival plays out. Corridors, rooms, hiding spots, resource locations. These spaces shape how survival mechanics feel. A medkit in the middle of a safe room feels different from a medkit in a dangerous corridor. Where you place resources matters as much as what those resources do.
