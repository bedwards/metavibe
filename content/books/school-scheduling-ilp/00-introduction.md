# Introduction

## The School Scheduling Problem

Every semester, school administrators face the same nightmare: create a schedule that assigns teachers to classes, classes to rooms, and everything to time slots—without conflicts.

Sounds simple. It's not.

A typical high school has:
- 50+ teachers with varying availability
- 200+ class sections across subjects
- 30+ rooms with different capacities and equipment
- 6-8 periods per day
- Hundreds of constraints (teacher preferences, room requirements, student conflicts)

The number of possible schedules is astronomical. A school with 50 teachers, 40 rooms, and 8 periods has over 10^100 possible assignments. Brute force doesn't work.

This is a classic constraint satisfaction problem—and it's NP-hard. There's no polynomial-time algorithm to find the optimal solution. But we don't need optimal. We need good enough, fast enough.

## Why Integer Linear Programming?

Integer Linear Programming (ILP) is the industry-standard approach for scheduling problems. It works by:

1. **Modeling decisions as variables** - Each possible assignment (teacher X teaches class Y in room Z at time T) becomes a binary variable (0 or 1)
2. **Expressing constraints as linear equations** - "No teacher can be in two places at once" becomes a sum constraint
3. **Optimizing an objective function** - Minimize conflicts, maximize preference satisfaction

ILP solvers have decades of research behind them. They use branch-and-bound, cutting planes, and other sophisticated techniques to find solutions quickly. A problem with millions of variables can often be solved in seconds.

## Why Not Other Approaches?

**Genetic algorithms** - Popular but unreliable. They often get stuck in local optima and provide no guarantee of finding feasible solutions. You might run for hours and still have conflicts.

**Constraint programming** - Good for small problems, but scaling is difficult. CP solvers enumerate possibilities, which becomes intractable for large instances.

**Manual scheduling** - The traditional approach. Administrators spend weeks shuffling spreadsheets. Any change triggers cascading conflicts. It's error-prone and exhausting.

**Commercial software** - Expensive ($10,000+ per year), often inflexible, and you don't own your data. Many are black boxes that don't explain why certain assignments were made.

ILP gives you the best of all worlds: mathematical guarantees, scalability, transparency, and control.

## Why Vibe Code It?

Building a scheduling system from scratch sounds daunting:
- Linear algebra and optimization theory
- Complex constraint modeling
- Solver integration
- User interfaces for data entry and visualization

With vibe coding, you describe what you want and iterate toward a working system. The AI handles the mathematical notation, the solver integration, the edge cases. You focus on the domain: what makes a good schedule?

This book walks through building a complete school scheduling system:
- Data model for teachers, classes, rooms, and constraints
- ILP formulation for the scheduling problem
- Integration with HiGHS (a high-performance open-source solver)
- Web interface for data management and schedule visualization
- Export to calendar formats

By the end, you'll have a working system and understand how to apply ILP to other scheduling problems: employee shifts, conference sessions, sports leagues, manufacturing.

## What We're Building

A web application with:

**Data Management**
- Teacher profiles with availability windows
- Class definitions with room requirements
- Room inventory with capacity and equipment
- Time slot configuration (periods, days)
- Constraint definitions (hard and soft)

**Schedule Generation**
- ILP model construction
- Solver execution with timeout
- Solution extraction and validation
- Infeasibility diagnosis

**Schedule Visualization**
- Grid view by teacher, room, or class
- Conflict highlighting
- Manual override interface
- Preference satisfaction metrics

**Export**
- iCal format for calendars
- CSV for spreadsheets
- PDF for printing

## The Technology Stack

- **TypeScript** - Type safety for complex data structures
- **Node.js + Express** - API server
- **PostgreSQL** - Relational data storage
- **HiGHS** - Open-source ILP solver (via highs-js)
- **Vite + React** - Frontend (or vanilla TypeScript)

Why HiGHS? It's:
- Free and open-source (MIT license)
- Fast (competitive with commercial solvers)
- Available as WebAssembly (runs in browser)
- Active development (part of COIN-OR project)

## Prerequisites

To follow along:
- **TypeScript experience** - You'll write complex types
- **Basic linear algebra** - Vectors, matrices, sums (helpful but we'll explain)
- **An AI coding assistant** - Claude Code, Cursor, or similar

You don't need prior experience with:
- Optimization theory (we'll cover it)
- ILP solvers (we'll integrate step by step)
- School administration (we'll model the domain)

## A Note on Complexity

School scheduling is genuinely hard. Real schools have bizarre constraints:
- "Mr. Smith can only teach periods 1-4 because he coaches after school"
- "The chemistry lab can't be used during lunch because of fume ventilation"
- "These two teachers can't be scheduled in adjacent rooms because they're too loud"
- "The band needs the auditorium every Thursday 3rd period"

No software handles every edge case out of the box. But ILP is flexible. Any constraint you can express as a linear equation can be added to the model. This book teaches you to think in constraints.

## Let's Build

School scheduling touches lives. A good schedule means teachers can balance work and life, students can take the classes they need, and administrators can stop dreading September.

Let's build something that makes schedules better.
