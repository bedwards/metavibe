# The Document That Defines Care

Behind every home healthcare visit lies a care plan. This document—part clinical assessment, part authorization, part to-do list—determines what care a patient receives. Get the care plan right and caregivers know exactly what to do. Get it wrong and care becomes inconsistent, unauthorized services get delivered, reimbursement gets denied.

Care plans in home healthcare evolved from nursing documentation practices developed in hospitals. A care plan traditionally includes assessment of the patient's condition, goals they're working toward, interventions designed to achieve those goals, and specific tasks that implement those interventions. The document creates accountability: what was supposed to happen, what actually happened, how the patient progressed.

Before software, care plans lived in paper binders. Clinical staff wrote assessments in narrative form. Goals were stated as paragraphs. Task lists were handwritten and updated by crossing out completed items. This worked when agencies were small and care teams were tight-knit. It breaks down at scale. Paper gets lost. Handwriting gets misread. Different caregivers interpret the same narrative differently.

Software-based care plans promise consistency. A structured care plan defines goals in specific terms with measurable outcomes. Tasks have standard names and expected durations. Progress notes follow templates that ensure relevant information gets captured. Multiple caregivers visiting the same patient work from the same document, seeing the same tasks in the same order.

But structured care plans introduce their own challenges. Clinical staff find them constraining—real patient needs don't always fit predefined categories. Data entry becomes a burden when every observation must be clicked through dropdowns rather than described in natural language. The structure that enables consistency can also feel like bureaucratic overhead that distracts from actual caregiving.

The best care plan systems balance structure with flexibility. They provide templates and categories while allowing free-form notes. They enforce required fields where regulators demand them while staying out of the way for optional documentation. They translate clinical thinking into data without forcing clinicians to think like databases.

Understanding the hierarchy of care plan elements clarifies how to model them in software.

At the top level, a care plan belongs to a patient and covers a specific time period. The plan might be authorized for six months, with a certain number of hours per week approved by the payer. This authorization constrains everything below—you can't schedule more hours than are authorized, you can't deliver services that aren't on the plan.

Goals describe what the patient should achieve. "Improve mobility" is too vague; "Patient will walk fifty feet with walker independently by end of month" is specific and measurable. Goals have target dates and status tracking. A goal might be not started, in progress, achieved, or discontinued. Progress toward goals should be documented regularly.

Interventions are the clinical strategies for achieving goals. For a mobility goal, interventions might include range-of-motion exercises, supervised walking practice, and home safety assessment. Each intervention maps to specific tasks that caregivers perform during visits.

Tasks are the concrete activities—help patient walk to mailbox, perform passive stretching of affected limb, assess home for fall hazards. Tasks have categories like personal care, medication management, mobility support, nutrition, companionship. Different task types may require different caregiver certifications.

This hierarchy—care plan to goals to interventions to tasks—creates a traceable chain from high-level clinical objectives to day-to-day caregiver activities. When a caregiver completes a walking task, that completion contributes to the mobility intervention, which advances the mobility goal, which fulfills part of the care plan.

The data model we developed reflects this hierarchy with a few practical modifications.

Care plans store patient reference, date range, authorization details, and payer information. The status field tracks whether the plan is still a draft, actively being followed, or has been completed or cancelled. Linking to the payer enables downstream billing—we know who to invoice for services delivered under this plan.

Goals attach to care plans with their own identifiers and status. Target dates help track whether goals are being achieved on schedule. Progress notes attach to goals, creating a history of documentation about how the patient is advancing toward each objective.

Interventions connect goals to task templates. The intervention describes the clinical approach; task templates define the specific activities that implement that approach. This separation matters because the same intervention might apply to multiple goals, and the same task template might support multiple interventions.

Task templates aren't tasks themselves—they're patterns from which actual tasks are generated. When a visit is scheduled, the system examines the care plan's task templates and creates concrete tasks for that specific visit. This generation happens automatically, ensuring every visit has the right tasks without manual configuration.

The status lifecycle for tasks moves through predictable stages. Tasks start as pending when generated. They become in-progress when the caregiver begins work. They end as either completed or skipped, with completion capturing the timestamp and performer while skipping requires a reason. This lifecycle enables both real-time tracking and historical analysis.

One discovery that emerged from our vibe coding sessions: AI assistance works particularly well for care plan generation from unstructured input.

Clinical staff often know what care a patient needs but find it tedious to click through structured forms. They might naturally say: "Mrs. Johnson needs help with bathing and dressing in the morning, medication reminders twice daily, and someone to walk with her around the block for exercise." Translating this to structured care plan elements manually takes time.

AI can parse this natural language description and generate appropriate structure. Bathing and dressing become personal care tasks attached to an ADL (Activities of Daily Living) intervention supporting an independence goal. Medication reminders become medication management tasks on a schedule. Walking becomes a mobility task linked to an exercise intervention.

The technique that produced best results was providing AI with the care plan schema and asking it to generate structured data from descriptions. "Given this patient description, generate a care plan in this JSON format with appropriate goals, interventions, and tasks." The AI understands healthcare terminology and produces clinically reasonable structures.

This natural language input doesn't replace clinical judgment—staff review and modify the generated plans. But it dramatically reduces the data entry burden that discourages thorough documentation. Staff spend time thinking about care rather than navigating dropdown menus.

Task prioritization emerged as an important feature once we had structured tasks.

Not all tasks are equally urgent. Medication administration has timing constraints—a twice-daily medication needs to happen at appropriate intervals. Personal care should happen before mobility exercises because patients feel more comfortable exercising after grooming. Some tasks depend on others; wound assessment should precede wound dressing.

We implemented a prioritization system that considers multiple factors. Task category provides base priority—medication tasks rank higher than companionship tasks by default. Timing constraints add urgency as deadlines approach. Patient condition affects priority—a declining patient's tasks get elevated. Historical patterns matter too—if a task has been skipped repeatedly, subsequent instances get priority boosts.

The prioritization produces a ranked task list that caregivers work through in order. They can deviate when circumstances require—a patient who seems distressed gets companionship before scheduled activities—but the default order reflects clinical priorities.

Testing care plan logic requires understanding the domain.

A care plan can't be activated without goals—that's a business rule, not just a validation. Goals without interventions are clinically meaningless. Tasks without proper categorization can't be billed correctly. These rules emerge from healthcare practice, and the software must enforce them.

We tested these rules explicitly. Create a care plan without goals, try to activate it, expect rejection. Create a care plan with goals, activate it, verify success. The tests document the business rules as much as they verify the code.

Integration with scheduling comes next. Care plans define what should happen; scheduling determines when it happens and who does it. The scheduler examines care plans to understand service requirements, then matches those requirements against caregiver availability and skills.

A complete care plan system enables the workflows that home healthcare depends on. Clinical staff create plans that specify care needs. The system generates tasks for each visit. Caregivers complete tasks and document outcomes. Progress accumulates toward goals. Supervisors review and adjust plans based on patient response.

The next chapter covers caregiver management—building the systems that track who can deliver care, when they're available, and how to match them with patients who need their skills.
