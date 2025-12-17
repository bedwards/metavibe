# The Foundation of Optimization

The architecture of a scheduling system differs from typical web applications in one crucial respect: at its heart sits a mathematical solver that transforms data into solutions. The rest of the system—data entry, visualization, export—exists to feed that solver and present its results. Understanding this inversion clarifies every architectural decision.

The solver itself is a black box, and deliberately so. You don't need to understand the branch-and-bound algorithm or the cutting plane methods that make ILP tractable. You feed the solver a model—variables, constraints, objective—and it returns a solution or reports that none exists. The complexity lies in building that model correctly. Every constraint you add shapes the solution space. Miss a constraint and you get invalid schedules. Add contradictory constraints and you get no schedule at all.

The stack that emerged from my vibe coding sessions was deliberately conventional outside the solver integration. Node.js with TypeScript provides type safety for the complex data structures that scheduling requires. PostgreSQL stores the relational data—teachers, classes, rooms, time slots—and the relationships between them. Express handles the API layer. A Vite frontend displays schedules and captures user input.

HiGHS serves as the solver. Originally developed at the University of Edinburgh, HiGHS has become one of the fastest open-source optimization solvers available. The project is part of COIN-OR, the Computational Infrastructure for Operations Research initiative. What makes HiGHS particularly suitable for this project is its WebAssembly build, which means you can run the solver in Node.js without native dependencies. Installation is simply adding the highs package.

The vibe coding technique that worked best for initial setup was describing the overall architecture and letting Claude generate the project structure. Not starting from configuration files, but from what the system needs to do. A data service handles CRUD operations for teachers, classes, rooms, and time slots. An ILP builder transforms that data into the mathematical model. A solver service runs HiGHS and returns results. A schedule service orchestrates the flow from data to solution and back.

The database schema deserves careful thought because it shapes how data flows into the model. Teachers have names, departments, maximum teaching loads, and availability patterns. Classes represent course definitions—the template from which sections are created. Sections are instances of classes assigned to specific teachers. Rooms have capacities and types—regular classroom versus laboratory versus auditorium. Time slots define the scheduling grid, typically six to eight periods across five weekdays.

The distinction between classes and sections matters for scheduling. Algebra I is a class. Three different sections of Algebra I, each taught by different teachers to different groups of students, are what actually get scheduled. This separation enables tracking which teacher handles which section and how many periods each section needs per week.

Constraints in the database use a flexible structure that can represent many different requirement types. A constraint has a type, a priority indicating whether it's hard or soft, a weight for soft constraints, and parameters that vary by constraint type. Teacher unavailable constraints reference specific teachers and time slots. Room required constraints bind sections to specific rooms. Maximum consecutive period constraints set limits on how long teachers work without breaks.

The solver wrapper that HiGHS requires follows a straightforward pattern. Initialize the solver, which loads the WebAssembly module. Set options for time limits, optimality gaps, and thread counts. Pass the model in LP format, a text-based representation of the optimization problem. Receive the result, which includes solution status, objective value, and variable assignments.

LP format is the lingua franca of linear programming solvers. It's a human-readable text format where you specify the objective, list constraints as linear equations, define variable bounds, and mark which variables are binary or integer. The format is verbose but unambiguous, making it ideal for debugging—you can look at the generated LP file and trace exactly what constraints are being passed to the solver.

The API layer exposes CRUD endpoints for each entity type plus specialized endpoints for scheduling operations. Generate a new schedule, get schedule status, view assignments, move assignments manually. The scheduling endpoints connect to the solver orchestration and return results including any warnings or errors.

Docker Compose simplifies development by running PostgreSQL in a container. The database initializes from migration files that create the schema. Sample data helps with testing—a realistic set of teachers, classes, and rooms lets you verify the solver produces sensible results.

The technique that accelerated development most was building the system in layers, verifying each before moving to the next. First, confirm that data entry and retrieval work correctly. Then build the model generation without solving, examining the generated LP file to verify it captures the intended constraints. Then integrate the solver and verify it produces solutions. Finally build the interface that presents those solutions to users.

Testing a scheduling system requires realistic data. A toy example with three teachers and five rooms finds solutions instantly but doesn't reveal performance problems. A school-scale dataset with fifty teachers, thirty rooms, and two hundred sections exercises the solver meaningfully. The test suite should include cases that are feasible, cases that are infeasible, and cases that stress the time limits.

The project structure that emerged follows familiar patterns. Source code in a source directory, organized by layer. Database code including migrations and the client. Services containing the business logic. API routes handling HTTP requests. Types defining the data structures that flow through the system. The frontend in a separate directory with its own build tooling.

Configuration through environment variables keeps sensitive information out of the codebase. Database connection strings, API ports, solver options—all configurable without code changes. A development configuration file sets sensible defaults while production deploys with appropriate values.

The foundation exists to support what comes next: modeling the scheduling problem as a set of mathematical constraints that the solver can understand and optimize.
