# Where Healthcare Meets Finance

Billing in home healthcare is where clinical complexity meets financial reality. Every verified visit must translate into a claim that someone will pay. The translation isn't simple—different payers have different rates, different formats, different requirements, different timelines. Getting billing wrong means not getting paid, which means not surviving.

Traditional healthcare billing required specialized expertise that took years to develop. Billers memorized payer requirements, claim formats, denial reason codes. They learned which documentation would satisfy which audit. This expertise was hard-won and difficult to replicate.

AI-assisted development doesn't eliminate the need for billing expertise, but it changes how that expertise gets implemented in software. The patterns are well-documented. The formats are standardized. The business rules, though complex, are deterministic. Describing billing requirements to AI produces systems that encode expertise rather than requiring it for every transaction.

Understanding the payer landscape clarifies what billing systems must handle.

Medicaid funds a large portion of home healthcare, particularly personal care services for low-income populations. Each state administers its own Medicaid program with its own rules, rates, and submission requirements. Many states contract with Managed Care Organizations—private insurance companies that administer Medicaid benefits. Dealing with MCOs adds another layer: the same service might be billed differently depending on which MCO covers the patient.

Medicare covers home health services for seniors and disabled individuals, but with different service definitions and stricter qualification requirements than Medicaid personal care. Medicare home health must be ordered by a physician and requires skilled nursing or therapy involvement. The billing formats and submission processes differ from Medicaid entirely.

Private insurance adds diversity. Each commercial payer has its own contracts, rates, and authorization processes. Some require prior authorization for every service. Others approve blocks of hours for a period. The variety means billing systems must handle payer-specific rules without becoming unmaintainably complex.

Private pay—patients or families paying out of pocket—is conceptually simplest but operationally messy. There's no external payer to bill, but there are payment collection challenges, sliding scale considerations, and the awkwardness of discussing money with people receiving care.

The billing workflow connects visits to payments.

It starts with service delivery. A caregiver completes a visit, documented through EVV. The visit record includes who received service, who provided it, what services were performed, when, and for how long. This documentation becomes the basis for billing.

Next comes claim generation. The visit data must be transformed into the format the relevant payer expects. For electronic billing, this typically means EDI (Electronic Data Interchange) transactions—standardized formats like the 837P for professional claims. Each field has specific requirements: procedure codes, diagnosis codes, place of service, rendering provider identifiers.

Claims get submitted to payers through various channels. Large payers accept electronic submissions directly. Others use clearinghouses—intermediary services that accept claims in standard formats and route them to appropriate payers. Paper claims still exist for small payers without electronic capabilities.

Payers process claims according to their rules. They verify patient eligibility, check authorization, validate documentation requirements, apply pricing rules, and either approve or deny the claim. This processing takes days to weeks depending on the payer.

Remittance arrives when claims are paid. The payer sends an ERA (Electronic Remittance Advice) explaining what was paid, what was denied, and why. The remittance must be posted against the original claims, updating account balances and identifying issues requiring follow-up.

Denial management consumes significant billing staff time. Denied claims need analysis—why was it denied? Is it correctable? Should it be appealed? Many denials result from simple errors: wrong patient identifier, missing authorization number, incorrect service code. These can be corrected and resubmitted. Others indicate substantive problems: service not covered, patient not eligible, documentation insufficient. These require investigation.

The revenue cycle encompasses this entire flow from service to payment, and healthy agencies track it closely.

Authorization management prevents billing problems before they occur.

Many payers require prior authorization—approval before services are delivered. Without authorization, services can't be billed even if they were clinically appropriate and properly documented. Authorization tracking ensures services stay within approved parameters.

Authorizations have limits: number of hours, date ranges, specific service types. The system must track utilization against these limits and alert when approaching thresholds. Running out of authorized hours mid-month creates both care coordination and billing problems.

Some payers require re-authorization periodically. Tracking these renewal deadlines and initiating requests with enough lead time prevents authorization gaps that make visits unbillable.

Rate management handles the price diversity across payers.

The same service—let's say one hour of personal care—might reimburse at different rates from different payers. Medicaid might pay eighteen dollars per hour. An MCO contract might specify twenty-two dollars. Private pay might be billed at thirty-five dollars. The billing system must know which rate applies to which patient for which service.

Rate schedules change over time. Annual Medicaid rate updates, contract renegotiations with MCOs, private pay price adjustments—all must be reflected in the system with appropriate effective dates. Historical rates matter too; claims for services delivered in January should use January rates even if submitted in March after rates changed.

Contract management for MCO relationships adds complexity. Each contract specifies covered services, rates, authorization requirements, claim submission deadlines, and appeal processes. These contracts are legal documents that define the billing relationship.

Financial reporting tells agencies whether they're healthy.

Accounts receivable aging shows how much money is outstanding and for how long. Healthcare has notoriously slow payment cycles—thirty to ninety days is common. But aging that creeps past ninety days signals collection problems.

Denial rate tracking reveals billing quality. High denial rates indicate problems in documentation, authorization management, or claim formatting. Identifying denial patterns enables targeted fixes.

Revenue by payer shows which relationships are profitable. A payer that denies frequently or pays slowly might not be worth the administrative burden. Financial visibility enables these strategic decisions.

Cash flow projection matters for agency survival. Knowing when payments will arrive, based on submission dates and typical payer response times, helps manage operational expenses. Home healthcare operates on thin margins; cash flow surprises can be existential.

The vibe coding opportunity in billing lies in the rule-based nature of the work.

Claim formatting follows specifications. EDI transaction structures are documented precisely—this field goes here, in this format, with these valid values. Describing these specifications to AI produces formatting code that would otherwise require tedious manual implementation.

Denial analysis follows patterns. Each denial reason code has standard meaning and typical resolution steps. AI can generate decision trees that guide billing staff through appropriate responses based on denial codes.

Financial calculations—applying rates, calculating balances, projecting revenue—are algorithmic. The formulas are known. AI generates the implementations.

What AI can't do is make policy decisions. Should the agency pursue private insurance contracts? What private pay rates are competitive in this market? When should a delinquent account be sent to collections? These strategic questions require human judgment informed by financial data that the system provides.

Testing billing systems requires understanding the financial implications of bugs.

A bug that formats claims incorrectly causes denials that delay payment. A bug that applies wrong rates causes over- or under-billing. A bug that loses remittance data causes reconciliation nightmares. The stakes are high.

We tested billing workflows end-to-end: generate claims from visits, validate formatting against specifications, simulate payer responses, post remittances, verify account balances. Each step had automated tests that prevented regression as the system evolved.

Billing connects to everything else in the healthcare platform. Care plans define what services are authorized. Scheduling determines when services are delivered. EVV verifies that services actually occurred. Billing translates all of this into revenue. The next chapter covers compliance—ensuring that all these interconnected systems operate within regulatory requirements.
