# Thinking in Constraints

Linear Programming begins with a deceptively simple idea. You have decisions to make, represented as variables. You have rules those decisions must follow, expressed as linear constraints. You have a goal, captured as an objective function. Find the values for the variables that satisfy all constraints while optimizing the objective.

Consider a factory making chairs and tables. Each chair requires two hours of labor and earns twenty dollars profit. Each table requires four hours and earns fifty. You have forty hours of labor available. How many of each should you make to maximize profit?

The decisions are how many chairs and how many tables. The constraint is that total labor cannot exceed forty hours. The objective is maximizing profit. Write this mathematically and a solver finds the answer instantly: make zero chairs and ten tables, for five hundred dollars profit. Tables earn more profit per labor hour, so the solver produces only tables.

Integer Linear Programming adds a crucial refinement. Standard LP allows fractional solutions—three and a half tables, for instance. Many real problems require whole numbers. You can't schedule half a class. A binary variable goes further, allowing only zero or one. This represents yes-or-no decisions: does this section get assigned to this room at this time? Binary variables are the building blocks of scheduling models.

The scheduling problem maps naturally onto this framework. The decision variables are binary: does section S get assigned to room R at time slot T? If yes, the variable equals one. If no, zero. For a school with a hundred sections, thirty rooms, and forty time slots, this creates a hundred times thirty times forty possible assignments—one hundred twenty thousand binary variables.

That number sounds enormous, but it's actually manageable. Most combinations are infeasible from the start. A section needing a lab can't use a regular classroom. A section with fifty students can't use a room that holds thirty. A teacher unavailable at 8 AM can't teach any section at 8 AM. Filtering out impossible combinations before building the model dramatically reduces problem size.

Hard constraints form the backbone of any scheduling model. A teacher can only be in one place at a time. For each teacher and each time slot, the sum of all assignments involving that teacher's sections at that time slot must be at most one. In mathematical terms, you sum the assignment variables for all sections taught by teacher T and all rooms R at time slot t, and constrain that sum to be less than or equal to one.

Room conflict constraints work the same way. For each room and each time slot, sum all assignments using that room at that time—the result must be at most one. No room can host two sections simultaneously.

Period requirements ensure every section gets scheduled appropriately. If a section needs five periods per week, sum all its assignments across all rooms and all time slots—that sum must equal exactly five. Not four, not six, exactly five.

Teacher availability constraints prevent scheduling when teachers can't work. If teacher T is unavailable at time slot t, then all assignment variables for T's sections at t must equal zero. The solver can't select these assignments because they're constrained to be impossible.

Room compatibility prevents mismatches. If section S requires a lab but room R isn't a lab, all assignment variables for S and R must be zero regardless of time slot. If room R holds thirty students but section S has forty, again all those variables must be zero.

Soft constraints work differently. Instead of requiring satisfaction, they penalize violation. Introduce auxiliary variables that measure how much each soft constraint is violated. Add these to the objective function with weights representing their importance. Minimizing the objective then minimizes constraint violations.

Teacher preference handling illustrates this pattern. If teacher T dislikes period p with preference negative two, every assignment of T's sections at p adds a penalty to the objective. The solver can still make those assignments, but it will prefer alternatives. The weight controls how hard the solver tries to honor preferences—higher weights mean stronger avoidance.

Consecutive period limits use auxiliary variables creatively. Define a variable that equals one if teacher T has more than three consecutive periods starting at a specific point. Constrain this variable to be at least as large as the excess over three. Add this variable to the objective with a significant penalty. The solver will avoid long stretches unless unavoidable.

The objective function combines all these penalties. Minimize the sum of all soft constraint violations multiplied by their weights. A teacher preference violation might weight five. A consecutive period violation might weight ten. The relative weights determine tradeoffs—the solver will accept two preference violations to avoid one consecutive period violation.

Building the model in code follows the mathematical structure. Create variables by iterating through sections, rooms, and time slots, filtering to only feasible combinations. Add constraints by iterating through teachers and time slots, summing relevant variables. Add soft constraint penalties by augmenting the objective function.

The vibe coding technique for model building was describing constraints in English and letting Claude generate the mathematical translation. No teacher can be in two places at once—express this as a sum constraint. Each section needs exactly its required periods—express this as an equality constraint. These translations are well-documented in optimization literature, making them ideal for AI-assisted development.

LP format output lets you verify the model before solving. The format is text-based and readable. You can examine constraints to verify they capture your intent. When solving fails, the LP file becomes a debugging tool—you can identify which constraints conflict or which variables have no feasible assignment.

Understanding these fundamentals enables applying ILP to any scheduling problem. Employee shifts follow the same patterns as school periods. Conference sessions follow the same patterns as class sections. The entities change, but the mathematical structure remains constant. Learn to think in constraints, and you gain a powerful tool for optimization problems across many domains.
