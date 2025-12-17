# The Federal Mandate That Changed Everything

Electronic Visit Verification began as a provision in the 21st Century Cures Act, passed in 2016. The intent was straightforward: reduce fraud in Medicaid home healthcare by requiring electronic documentation of every visit. Paper timesheets had enabled systematic billing for services never delivered—caregivers clocking hours they never worked, agencies billing for patients they never saw.

The mandate required states to implement EVV for personal care services by January 2020 and for home health services by January 2023. States that failed to comply faced reduced federal Medicaid funding—a penalty harsh enough to ensure universal adoption.

For home care agencies, EVV transformed from optional efficiency tool to existential requirement. No compliant EVV system means no Medicaid reimbursement. No reimbursement means no agency.

The six required data points seem simple enough. Type of service—what care was provided. Individual receiving service—which patient. Individual providing service—which caregiver. Date of service—when. Time in and out—duration. Location—where the service was delivered. Six pieces of information that must be captured electronically for every Medicaid-funded visit.

The implementation complexity emerges from how these requirements interact with real-world caregiving.

Location verification typically uses GPS. The caregiver's mobile device captures coordinates at clock-in and clock-out. But patients live in places where GPS is unreliable—basement apartments, thick-walled buildings, rural areas with poor satellite visibility. What happens when the GPS signal fails?

Time verification seems straightforward until you consider the edge cases. What if the caregiver arrives early and the patient isn't ready? What if the visit runs long because of an emergency? What if connectivity fails and the clock-in can't be recorded in real time?

Identity verification raises privacy questions. How do you prove the patient actually received service? Signatures work but feel burdensome for elderly patients with limited mobility. Biometric verification feels invasive. Different states have reached different conclusions.

States implemented EVV differently, creating a patchwork of requirements. Some states mandated specific EVV vendor systems. Others adopted an open model where agencies could use any compliant software that integrated with a state aggregator. Some added requirements beyond the federal minimum—additional data fields, specific verification methods, enhanced documentation.

The aggregator model deserves explanation because it shapes software architecture.

State aggregators are centralized systems that receive EVV data from all providers. Think of them as clearinghouses—your software submits visit data, the aggregator validates it, and the data becomes available for state audits and billing reconciliation.

Each state aggregator has its own API, its own data format, its own submission requirements. Building EVV software that works across states means building integrations for multiple aggregators—or building flexible architecture that can adapt to different aggregator specifications.

We discovered that aggregator integration was an excellent vibe coding target. The integration logic follows predictable patterns: authenticate with the aggregator API, transform internal data to aggregator format, submit records, handle responses and errors. Describing these patterns to AI produces working integration code that would otherwise require hours of documentation reading and trial-and-error testing.

The clock-in workflow represents the moment when EVV data capture begins.

A caregiver arrives at a patient's home and opens the mobile app. The app requests GPS coordinates and displays the scheduled visit information. The caregiver verifies they're at the correct location—the system compares GPS coordinates to the patient's known address, checking that the distance falls within acceptable tolerance.

If location verification fails—GPS unavailable, coordinates too far from expected address—the system must handle the exception. Maybe it allows manual override with explanation. Maybe it requires supervisor approval. Maybe it blocks clock-in entirely. The policy choice depends on state requirements and agency risk tolerance.

Upon successful location verification, the app records the clock-in time. This timestamp becomes part of the permanent EVV record. The caregiver may sign electronically, confirming they're beginning service. In some implementations, the patient also signs, confirming the caregiver's arrival.

The visit itself happens outside the system's awareness—the caregiver is providing care, not interacting with software. But the tasks from the care plan appear in the app, and the caregiver marks them complete as they're performed. These task completions document what service was actually delivered.

Clock-out mirrors clock-in. GPS capture confirms the caregiver is still at the patient's location. Timestamp records when service ended. Duration calculates automatically. Both parties may sign to confirm service completion. The EVV record is now complete for this visit.

Exception handling distinguishes robust EVV systems from fragile ones.

GPS failures happen regularly. The app must capture whatever location data is available while flagging the exception for supervisor review. Some agencies configure fallback verification methods—telephony-based check-in where the caregiver calls from the patient's landline, alternative signature capture, manual coordinator confirmation.

Time discrepancies require policy decisions. If a visit was scheduled for two hours but the caregiver clocked three, should the system accept the longer duration? If it was scheduled for Tuesday but the caregiver clocked in Wednesday, is that a simple reschedule or a compliance violation?

The best approach we found was capturing everything while flagging anomalies. Record the actual times and locations even when they don't match expectations. Generate exception reports that supervisors review daily. Let humans make judgment calls while the system ensures nothing gets lost.

Signature capture adds verification that electronic timestamps alone don't provide.

Patient signatures confirm that the person receiving service was actually present and aware of the visit. This seems redundant with location verification—if the caregiver was at the patient's address, wasn't the patient presumably there? But patients sometimes leave during visits, or visits occur at secondary locations, or the wrong patient is seen at a shared facility.

Caregiver signatures confirm the caregiver's identity and their attestation that they provided the documented services. This creates personal accountability that timestamp logs don't establish.

Electronic signatures present implementation challenges. How do you capture a signature on a phone screen from an elderly patient with trembling hands? How do you verify that the signature is genuine and not just a scribble? Some systems use typed names as signatures, which feels inadequate. Others require stylus input, which works better but requires hardware caregivers might not have.

We implemented flexible signature capture—stylus when available, finger on screen otherwise, typed name as fallback with supervisor notification. The goal was ensuring some verification happened at every visit while accommodating the physical limitations of the populations being served.

Aggregator submission happens after visit completion.

The EVV record moves from local storage to the state aggregator. Submission might happen immediately if connectivity is good, or batch later if the caregiver was offline. The aggregator validates the data—checking required fields, verifying format compliance, confirming that the patient and caregiver are registered in state systems.

Validation failures require handling. Maybe the patient's Medicaid ID doesn't match state records. Maybe the service type code is invalid. Maybe the caregiver isn't registered with this agency in the state system. Each failure type requires different resolution—some are data entry errors fixable by the agency, others require state-level corrections.

Successful submissions return confirmation identifiers that should be stored for audit purposes. The visit is now documented in the state's official records, which means it can be billed.

Compliance reporting helps agencies identify problems before they become crises.

Daily exception reports show visits with verification failures. Weekly compliance dashboards show trends—are GPS failures increasing? Are certain caregivers consistently clocking in late? Are particular patients associated with more exceptions than average?

These reports enable proactive management. An agency that reviews exceptions daily catches problems while they're still fixable. An agency that ignores reports until audit time finds problems that have compounded for months.

We built compliance reporting that surfaced the information coordinators actually needed. Not every data point about every visit, but the exceptions, trends, and outliers that required human attention. The goal was making compliance management sustainable rather than overwhelming.

The vibe coding advantage for EVV lies in the pattern-heavy nature of the work.

EVV systems require handling many similar operations: capturing coordinates, validating distances, recording timestamps, managing signatures, formatting data for submission, handling API responses. Each operation follows predictable patterns. Describing those patterns to AI produces reliable implementations.

The technique that worked best was describing complete workflows rather than individual functions. "Implement the clock-in workflow: request GPS coordinates, compare to patient address, display distance, require confirmation if distance exceeds threshold, capture timestamp, optionally collect signature, create EVV record draft." This holistic prompt generates coherent code that handles the workflow end-to-end.

Testing EVV requires simulating real-world conditions.

Can the system handle GPS timeout gracefully? Does offline mode preserve EVV data correctly? Do aggregator submissions recover from transient failures? These scenarios don't occur during normal development testing but happen constantly in production.

We built test suites that simulated challenging conditions: delayed GPS responses, network interruptions mid-submission, invalid data returned from aggregator APIs. Testing these edge cases prevented embarrassing production failures.

EVV compliance connects directly to billing. The next chapter covers healthcare billing—translating verified visits into claims, navigating payer requirements, managing the revenue cycle that keeps agencies operating.
