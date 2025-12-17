# Scaling to Larger Schools

The basic ILP model works well for small to medium schools. A hundred sections, thirty rooms, forty time slots—the solver finds optimal solutions in seconds. But larger schools stress the approach. Five hundred sections, a hundred rooms, dozens of constraint types—solve times stretch from seconds to minutes to hours. Optimization techniques become essential.

Variable filtering eliminates impossibilities before the solver sees them. The model builder already skips infeasible combinations, but more aggressive filtering helps further. If a teacher is unavailable for half the periods, half the variables involving their sections disappear. If capacity requirements eliminate most rooms for large sections, those variables never get created. The goal is the smallest model that still contains all valid solutions.

The payoff from filtering compounds. Fewer variables mean fewer constraints, since constraints reference variables. Fewer constraints mean smaller matrices. Smaller matrices solve faster. A fifty percent reduction in variables might produce a seventy-five percent reduction in solve time.

Constraint aggregation combines similar constraints where possible. If a constraint is mathematically redundant with another, remove it. If two constraints share most of their variables, consider whether they can be combined. Duplicate constraints slow the solver without adding information.

Iterative solving breaks large problems into phases. The first phase solves a relaxed version—perhaps ignoring soft constraints entirely—to find any feasible solution quickly. The second phase fixes high-confidence assignments from the first solution and re-solves with soft constraints active. Each subsequent phase refines the solution while preserving what earlier phases established.

This hierarchical approach trades optimality for speed. The final solution might not be globally optimal, but it respects priorities. Hard constraints are satisfied by the early phases. Soft constraints optimize within the space that hard constraints allow. The result is good even if not perfect.

Warm starting uses previous solutions to accelerate new solves. If you generated a schedule yesterday and need to regenerate today with minor changes, the previous solution provides a starting point. The solver doesn't search blindly from scratch; it starts from a known good solution and explores nearby improvements. Minor changes to constraints produce minor changes to solutions, and warm starting exploits this locality.

Multi-objective optimization addresses competing goals formally. Some schools care most about teacher preferences. Others prioritize room utilization. Others emphasize student convenience. Rather than combining all objectives into a weighted sum, hierarchical optimization solves for each objective in priority order, constraining each solved objective before moving to the next.

Solve first for hard constraint satisfaction—any feasible solution. Then solve for the top priority soft objective, constraining that the hard constraints remain satisfied. Then solve for the next priority, constraining that the previous objectives don't degrade beyond tolerance. Continue through all priority levels. The result respects the ordering explicitly.

Solver option tuning affects performance significantly. The default MIP gap of zero requires proving global optimality, which might take hours. Accepting a one percent gap often produces excellent solutions in seconds—the last fraction of a percent rarely matters in practice. Time limits prevent runaway solves; even a suboptimal solution found in five minutes beats no solution found after an hour of waiting.

Thread counts let the solver parallelize across CPU cores. On a multi-core server, this speeds solving considerably. On a single-core environment, multiple threads add overhead without benefit. Auto-detection usually makes good choices.

Presolve preprocessing simplifies models before solving begins. The preprocessor eliminates fixed variables, substitutes constraints, tightens bounds, and applies dozens of other transformations that often reduce problem size dramatically. Leaving presolve on almost always helps.

Database optimization supports the application around the solver. Materialized views pre-compute the schedule grid data that the interface repeatedly queries. Indexes accelerate the joins that build assignments with their related entities. Connection pooling prevents database access from becoming a bottleneck.

Background job processing makes long solves user-friendly. Rather than blocking a web request for minutes, accept the solve request, return a job identifier, and process the solve asynchronously. A status endpoint lets the frontend poll for completion. When solving finishes, results persist for later retrieval.

Caching solver results prevents redundant computation. If the same schedule gets requested multiple times with no data changes, return the cached result rather than solving again. Invalidate the cache when underlying data changes.

The system that emerged from my vibe coding sessions handles schools ranging from small to medium-large. Very large schools—universities with thousands of sections—might need additional techniques beyond what's described here. But the fundamentals scale: express requirements as constraints, let the solver optimize, present results through clear interfaces.

The broader pattern applies beyond school scheduling. Employee shift scheduling follows the same structure: workers instead of teachers, shifts instead of periods, positions instead of rooms. Conference session scheduling assigns talks to time slots and rooms. Sports league scheduling assigns games to dates and venues. Manufacturing scheduling assigns jobs to machines and time windows.

In each domain, the approach is the same. Identify the decision variables—what are you assigning to what? Express the hard constraints—what must never happen? Express the soft constraints—what should be avoided if possible? Define the objective—what does a good solution look like? Build the model. Run the solver. Present the results.

Learning to think in constraints is the lasting skill. The specific techniques for school scheduling are details. The ability to recognize constraint satisfaction problems and formulate them mathematically is the power. Once you see problems this way, you find them everywhere. And you know that modern solvers can handle them, often in the time it takes to have a cup of coffee.
