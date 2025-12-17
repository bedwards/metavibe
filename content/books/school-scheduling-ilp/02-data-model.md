# The Entities That Define a Schedule

School scheduling answers one question across every possible combination: when does who teach what where? The entities embedded in that question—teachers, classes, rooms, time slots—form the data model that everything else builds upon. Getting this model right determines whether the system captures real-world complexity or fights against it.

Teachers are the most constrained resource. A teacher can only be in one place at a time—the most fundamental hard constraint. But teachers also have limited availability. Part-time faculty work only certain days. Teachers with coaching duties leave early on game days. Some teachers commute long distances and can't teach first period. Personal preferences layer on top of availability: morning people versus night owls, Friday avoiders, those who prefer back-to-back classes for focus versus those who need breaks between sessions.

The teacher data model captures all of this. Basic information like name, email, and department. Maximum periods per day and per week to prevent burnout. Availability records that specify, for each time slot, whether the teacher is available and how strongly they prefer or avoid that slot. A preference scale from strongly avoid to strongly prefer gives the optimization something to work with beyond simple yes or no.

Classes and sections require careful distinction that casual thinking often blurs. A class is a course definition—Algebra I, World History, Introduction to Chemistry. It has a name, a course code, a department, required periods per week, and flags for special requirements like laboratory space. A class is an abstract template.

A section is a concrete instance of a class. When fifty students sign up for Chemistry and the lab only holds twenty-five, you create two sections. Each section has an assigned teacher, a specific student capacity, and its own scheduling needs. The class says Chemistry needs lab space three times per week. The two sections are what actually get scheduled into specific rooms and time slots.

This separation enables modeling that matches how schools actually work. Multiple teachers can teach the same class without confusion. Constraints can apply at the class level, affecting all sections, or at the section level, affecting just one. A lab requirement on the class propagates to every section. A specific room requirement on a section applies only to that instance.

Rooms vary in ways that matter for scheduling. Capacity determines how many students can fit. Room type distinguishes regular classrooms from labs, auditoriums, computer rooms, and specialty spaces. Equipment listings track what each room offers—projectors, whiteboards, computers, science benches. These attributes connect to section requirements: a chemistry section needs a lab with appropriate equipment; a lecture section just needs enough seats.

Time slots define the scheduling grid. Most schools use five days per week—Monday through Friday—with six to eight teaching periods per day. Each slot has a day, a period number, and actual clock times. Some slots are breaks rather than teaching periods—lunch, passing time between classes. The break flag keeps these slots out of the assignment pool while maintaining accurate time tracking.

The relationship between time slots and availability enables fine-grained control. A teacher might be unavailable on Monday first period but available every other Monday slot. They might be unavailable all of Wednesday for another commitment. The availability records capture this granularity without requiring special cases in the scheduling logic.

Constraints deserve their own data model because they vary so widely. Hard constraints must be satisfied for the schedule to be valid. No teacher in two places at once. No room double-booked. Teacher available when scheduled to teach. These constraints admit no flexibility—violating them produces an invalid schedule.

Soft constraints should be satisfied but can be violated with a penalty. Minimize consecutive periods for teachers. Honor period preferences when possible. Keep sections of the same class in the same room across the week. These constraints guide optimization toward better solutions without making perfection mandatory.

The constraint data model uses a flexible structure. Each constraint has a type that identifies what kind of constraint it is. A priority flag distinguishes hard from soft. A weight for soft constraints indicates relative importance—higher weights mean greater penalties for violation. Parameters store the constraint-specific details in a structure that varies by type.

This flexibility enables adding new constraint types without schema changes. A teacher unavailable constraint stores a teacher ID and time slot ID. A maximum consecutive constraint stores the maximum allowed and which teacher it applies to. A room required constraint binds a section to a specific room. The parameters field accommodates whatever data each constraint type needs.

Validation before solving catches problems early. Every section needs an assigned teacher—you can't schedule what has no one to teach it. Total required periods across all sections must not exceed total available room-slots—otherwise no feasible schedule exists. Lab sections need enough lab periods available. Teachers with many sections assigned need enough available periods to teach them all.

These validation checks surface impossible situations before the solver wastes time proving infeasibility. A helpful error message explaining that the chemistry department needs more lab time than the school has labs beats a cryptic solver failure after five minutes of computation.

The vibe coding approach to building this data layer worked well because the domain is explicit. Describe what a teacher record needs to contain. Describe the relationship between classes and sections. Describe how constraints should be stored. Claude generates the database schema and the TypeScript types that match it. The services that create, read, update, and delete these entities follow from their structure.

Testing the data layer requires realistic scenarios. Load a hundred teachers with varied availability. Create two hundred sections across different departments. Define thirty rooms with different capacities and types. Add dozens of constraints representing actual school policies. This realistic data reveals edge cases that toy examples miss.

The data model is the foundation on which the ILP model builds. Every teacher, every section, every room, every time slot becomes input to the optimization. Every constraint becomes a mathematical equation. The cleaner the data model, the cleaner the translation to mathematics.
