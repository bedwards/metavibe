# From Requirements to Equations

The complete scheduling model combines everything discussed so far into a unified mathematical object that solvers can optimize. Building this model correctly determines whether the system produces usable schedules or fails mysteriously. The translation from domain requirements to mathematical constraints is where vibe coding shines—describing what you need in English and receiving the mathematical formulation in return.

Indexing efficiently becomes critical as model size grows. Rather than repeatedly scanning entity lists, build index structures during model construction. Map each section to its teacher. Map each teacher to the list of sections they teach. Map each section to its required periods. Map each room to its capacity. Map each time slot to its day and period number. These lookups happen thousands of times during constraint generation; making them fast makes model building practical.

Variable creation starts with the full combinatorial space and filters down to feasibility. For each section, each room, each time slot—that's the outer loop structure. Within that loop, check feasibility. Does this section need a lab that this room doesn't provide? Skip it. Does this section have more students than this room's capacity? Skip it. Is the section's teacher unavailable at this time slot? Skip it. Only create variables for combinations that could actually occur in a valid schedule.

This filtering dramatically reduces model size without losing any valid solutions. A school with a hundred sections, thirty rooms, and forty time slots has a theoretical maximum of a hundred twenty thousand variables. After filtering for room compatibility and teacher availability, the practical count might be fifty thousand or less. Smaller models solve faster.

The model builder maintains two parallel data structures. The variables collection stores information about each decision variable—its name, its type, its bounds, its objective coefficient. The constraints collection stores the linear constraints—each constraint's name, the coefficients for each variable involved, the sense of the comparison, and the right-hand side value.

Teacher conflict constraints iterate over teachers and time slots. For each combination, find all variables involving any section taught by that teacher at that time slot. If multiple such variables exist, add a constraint requiring their sum to be at most one. If only one exists or none exist, no constraint is needed for that combination.

Room conflict constraints follow the same pattern. For each room and time slot combination, find all variables using that room at that time. Add a constraint if multiple variables exist. The constraint ensures only one section can occupy each room-slot pair.

Period requirements iterate over sections. For each section, sum all variables assigning that section anywhere—across all rooms and time slots. Constrain this sum to equal exactly the section's required periods. If a section needs five periods, it gets exactly five, no more and no less.

One section per time slot prevents a section from appearing in multiple rooms simultaneously. For each section and time slot, sum the variables across rooms. This sum must be at most one—a section can use at most one room at any given time. This constraint seems redundant with teacher conflicts, but it catches edge cases where different constraints interact unexpectedly.

Soft constraint handling adds objective coefficients to variables. When teacher T dislikes time slot t, find all variables for T's sections at t. Increase their objective coefficients by the penalty amount. The solver, minimizing the objective, will avoid these assignments when alternatives exist.

Consecutive period handling requires auxiliary variables. For each teacher and each potential start of a consecutive sequence, create a helper variable. Add a constraint linking this helper to the actual assignment variables—if the sum of assignments in a window exceeds the maximum allowed consecutive periods, the helper must be positive. The helper carries an objective penalty that discourages but doesn't forbid long teaching stretches.

The builder class accumulates variables and constraints, then exports the complete model. The export format matters for solver integration. LP format, the standard text-based representation, lists the objective first, then constraints, then variable bounds, then integer and binary markers. This format is human-readable, making it useful for debugging.

Model statistics provide insight into complexity. Count total variables, binary variables, constraints, and non-zero coefficients. The ratio of non-zeros to the product of variables and constraints indicates matrix density—sparser matrices often solve faster. A typical medium-sized school produces around fifty thousand variables and five thousand constraints with perhaps two hundred thousand non-zero coefficients.

Validation before solving catches model errors early. Every section should have at least one feasible assignment—some combination of room and time slot that passes all filters. If a section has no feasible assignments, the model is guaranteed infeasible. Check that period requirement constraints reference enough variables to be satisfiable. If a section needs five periods but only four feasible room-slot combinations exist, no solution is possible.

These validation checks transform cryptic solver failures into actionable error messages. The solver reports infeasibility with minimal explanation. The validator explains that chemistry section three needs a lab but no labs are available on Tuesday afternoon when the teacher is available. This specificity makes problems fixable.

The vibe coding approach to model building worked exceptionally well. Describe each constraint type in plain English. Request the mathematical formulation and the code that implements it. Review the generated constraints against your understanding of the domain. Iterate when something doesn't match expectations. The mathematical patterns are well-documented; translating them to code is mechanical; AI handles mechanical translation fluently.

Testing the model builder requires examining the generated LP files. For a small test case, manually verify that constraints exist for every teacher-slot pair with multiple sections. Verify that period requirements match section needs. Verify that objective coefficients appear where preferences apply. This verification builds confidence that the mathematical model captures your intent.

The model builder is where domain knowledge becomes mathematics. Every requirement administrators express—from hard constraints like room capacity to soft preferences like avoiding 8 AM—becomes part of the model that the solver optimizes. The cleaner this translation, the better the resulting schedules.
