# Displaying the Results

A schedule that exists only in a database serves no one. The interface that presents schedules to users determines whether the system is actually useful. Administrators need to see the complete picture. Teachers need to find their assignments. Students need to know where to be. The schedule grid—showing what happens when and where—is the primary view that everyone needs.

The grid visualization follows a familiar pattern: time flows down the rows, days spread across the columns. Each cell might be empty or contain an assignment. The information in each cell varies by viewing mode. An overview shows class code, room, and teacher. A teacher-filtered view shows only that teacher's assignments, omitting their name since it's obvious. A room-filtered view shows everything happening in that room.

Building the grid requires combining data from multiple sources. Time slots define the row structure. Day headers define the columns. Assignments fill the cells by matching their time slot to the appropriate row and their day to the appropriate column. Some cells remain empty—not every period has a class in every room.

Conflict highlighting catches problems at a glance. If two assignments overlap—same teacher at the same time, or same room at the same time—they appear in red. These conflicts shouldn't exist if the solver worked correctly, but manual overrides can create them, and visualization ensures they're immediately visible.

Manual overrides let administrators adjust what the solver produced. Drag an assignment from one cell to another to change its time slot. The system validates the move—does it create a teacher conflict? Does it create a room conflict? Does the new room have adequate capacity? Valid moves execute immediately and mark the assignment as manually overridden. Invalid moves produce error messages explaining why they can't happen.

The move validation logic mirrors the constraint logic in the model builder. Check whether the teacher has another assignment at the target time. Check whether the room is occupied at the target time. These checks happen server-side to prevent inconsistent state, with quick feedback to the user about success or failure.

View mode selection lets users focus on what they need. Overview mode shows everything, useful for administrators checking the complete schedule. Teacher mode filters to a single teacher, useful for teachers reviewing their weekly schedule. Room mode filters to a single room, useful for facilities staff managing space utilization. Each mode adjusts what information appears in cells and which cells are visible at all.

The entity selector appears when viewing by teacher or room. A dropdown lists all teachers or all rooms; selecting one filters the grid to show only their assignments. The list should be sorted usefully—alphabetically by name, or grouped by department. Quick filtering through typing helps when lists grow long.

Cell click interactions reveal details and enable actions. Clicking an assigned cell shows full details about that assignment—section information, teacher, room, any special notes. From this detail view, users can delete the assignment or access move functionality. Clicking an empty cell offers to create a new manual assignment, selecting from available sections.

Legends explain the visual encoding. Color indicates status—normal assignments in one color, manually overridden in another, conflicts in warning colors. Users who didn't build the system need this documentation embedded in the interface itself.

Responsive design matters if administrators access the system from tablets or phones. The grid doesn't compress gracefully to phone screens, but it should at least remain usable on tablets that administrators might carry during room walkabouts. Horizontal scrolling handles days that don't fit; vertical scrolling handles periods.

The vibe coding approach to interface development focused on describing user workflows. What does an administrator need to do? View the complete schedule, identify problems, make adjustments. What does a teacher need to do? Find their personal schedule, export it to their calendar. Each workflow became a set of interface requirements that Claude translated into components.

Testing the interface requires actual schedules to display. The mock data used for solver testing serves here too. Load a realistic schedule, navigate through views, verify assignments appear correctly, test the move functionality. Visual testing with screenshots catches layout issues that unit tests miss.

Export functionality extends the schedule beyond the web interface. iCal format produces calendar files that teachers import into Outlook or Google Calendar. The export generates recurring events for each assignment, spanning the semester dates. Teachers appreciate not having to manually enter their schedules into their personal calendars.

Calendar export involves date arithmetic. Each assignment has a day of week and a time. Convert this to actual dates across the semester range. Handle holidays and breaks when classes don't meet. Generate the iCal format with proper event structures, unique identifiers, and location information.

PDF export serves printing needs. Despite the digital age, some teachers want paper schedules on their walls. The PDF should present the same grid view in a format suitable for printing. Page layout becomes important—landscape orientation usually works best, with appropriate font sizes for readability.

The interface is where users encounter the scheduling system. All the mathematical sophistication in the solver means nothing if users can't understand, adjust, and export the results. Getting the interface right makes the difference between software that helps and software that frustrates.
