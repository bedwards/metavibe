# The Engine That Finds Solutions

HiGHS transforms mathematical models into solutions. Originally developed at the University of Edinburgh, it has become one of the most capable open-source optimization solvers available. Its WebAssembly build means you can run it in Node.js without native dependencies—a significant advantage for deployment simplicity. Installation is trivial, solving is fast, and the license is permissive.

The solver accepts LP format input, the standard text representation of linear programs. Your model builder generates this format. The solver returns a result containing status, objective value, and variable assignments. The status might be optimal, indicating the best possible solution was found. It might be feasible, indicating a valid solution exists but optimality wasn't proven within time limits. It might be infeasible, meaning no solution exists that satisfies all constraints. Handling each status appropriately is essential.

Solver options control the search process. Time limits prevent runaway computation—setting a five-minute limit ensures you get some answer even if optimality requires hours. The MIP gap setting controls when to stop searching: a one percent gap means the solver stops when it finds a solution proven to be within one percent of optimal. Accepting slightly suboptimal solutions often saves substantial time. Thread counts let the solver parallelize on multi-core systems. Presolve settings control preprocessing that often simplifies the model dramatically.

Initializing the solver loads the WebAssembly module. This happens once and the solver persists for subsequent calls. The initialization delay is noticeable—perhaps a second or two—but subsequent solves start immediately. In a server context, initialize once at startup and reuse for all scheduling requests.

Parsing solver results requires understanding what HiGHS returns. The status field uses standard optimization terminology. Optimal means perfect. Feasible means good enough. Infeasible means impossible. Time limit reached means the solver ran out of time but may have found a feasible solution. The objective value tells you how much soft constraint violation the solution has—lower is better.

Variable assignments come back as an array of values, one per variable in the model. For binary variables, values near one indicate selection; values near zero indicate non-selection. The threshold of 0.5 separates them. Due to numerical precision, values might be 0.9999 or 0.0001 rather than exactly one or zero. Rounding to the nearest integer handles this gracefully.

Solution extraction translates solver output back to domain objects. Each selected variable represents an assignment: this section in this room at this time. Parse the variable names to extract the entity IDs. Build assignment records linking sections to rooms and time slots. Aggregate statistics—how many periods each section received, how many slots each room is using, how many periods each teacher is teaching.

Validation after extraction catches solver bugs or model errors. Every section should have exactly its required periods—if not, something went wrong in either model building or solution extraction. No teacher should appear in two places at once—if they do, teacher conflict constraints failed somehow. No room should be double-booked. These checks seem redundant with the constraints themselves, but they provide defense in depth.

Infeasibility diagnosis transforms a cryptic solver failure into actionable information. When the solver reports infeasible, something in the model contradicts itself. The diagnosis process checks for obvious causes. Does the school need more total periods than exist across all rooms and slots? Does the chemistry department need more lab periods than the labs can provide? Does any teacher have more assigned sections than their available time allows? Each diagnosed cause suggests specific remediation.

The orchestration service ties everything together. Load all data from the database. Build the model using the ILP builder. Export to LP format. Invoke the solver with appropriate options. Check the result status. If optimal or feasible, extract the solution and save assignments to the database. If infeasible, run diagnosis and report causes. If time limit reached, extract whatever solution exists and note that it may be suboptimal.

Error handling throughout this flow prevents partial failures. Database errors during loading should abort cleanly. Model building errors should provide diagnostic information. Solver crashes—rare but possible—should be caught and reported rather than crashing the entire service.

The API endpoint that triggers scheduling wraps this orchestration. Accept schedule name, semester identifier, and optional solver settings. Invoke the orchestration service. Return a result indicating success or failure, the schedule ID for successful generations, solve time, assignment count, and any warnings or errors. The frontend can poll this endpoint for progress or wait for completion.

Async execution suits long-running solves. Rather than blocking the HTTP request for five minutes of optimization, return a job ID immediately and let the solve run in the background. A separate status endpoint lets the frontend poll for completion. When solving finishes, results persist in the database where the frontend can retrieve them.

The vibe coding approach for solver integration focused on describing the workflow rather than the implementation details. What should happen when we want to generate a schedule? Load data, build model, solve, extract solution, save results. Each step became a service method. Error handling and edge cases emerged through iteration—what if the solver times out? What if the model is infeasible? Each question prompted additional handling.

Testing solver integration requires multiple scenarios. A simple case that solves instantly verifies the happy path. A case with known infeasibility verifies diagnosis. A large case that times out verifies handling of partial results. Edge cases like empty schedules or single-section cases catch surprising failures. The test suite exercises the solver enough to build confidence without wasting minutes on every test run.

The solver is where mathematics becomes schedules. Everything else—data modeling, constraint specification, interface design—exists to feed the solver and present its results. Getting solver integration right makes the entire system useful.
