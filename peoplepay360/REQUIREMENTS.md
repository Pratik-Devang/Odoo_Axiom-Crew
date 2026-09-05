# Requirements and prototype scope

Source material:

- `C:/Users/PRATIK/Desktop/TempDocs/Odoo-PeoplePay360 HR & Payroll.pdf`
- `C:/Users/PRATIK/Desktop/TempDocs/HRMS OXP - 24 hours.excalidraw`

The files were treated as product references. The user's request defines delivery: a basic working-prototype codebase, with the dashboard and reference workflows, followed by an explicit instruction to leave building and testing to the team.

## Implemented in code

| Reference requirement | Prototype implementation |
| --- | --- |
| Dashboard combines HR and payroll records | Actual employee, contract, attendance, leave and payslip data are aggregated; no hardcoded KPI totals. |
| Period, department and employee type filters | All three controls update relevant dashboard aggregates; company is the single OXP sample company. |
| Payroll totals and trends | Paid net salary, generated payslips, average net salary, six-month paid history, and department gross cost. |
| HR dashboard summaries | Approved time off days, pending requests, leave balances, attendance health and department headcount. |
| Payroll alerts | Unpaid payruns, pending leave, missing bank references and expiring contracts. Duplicate inclusion is blocked before run creation and checked during validation. |
| Employee Kanban/list/form | Cards and table open the same employee profile. Editable work details, bank reference, type and active/archive status. |
| Employee smart buttons | Filtered contracts, attendance, leave requests and allocations. |
| Contracts and history | Create/edit contracts, dates, wages, salary structure and schedule. Overlapping date ranges are rejected; finalized payroll terms are protected. |
| Working schedules | Configurable days, shift times and breaks; calculated weekly hours. |
| Attendance | Recorded check-in/out, worked hours, absence, lateness, missing check-out and manual edit indication. |
| Attendance quick widget | Check-in/out for demo administrator with elapsed time and active indicator. |
| Time Off navigation | Requests, Allocations and Types are reached through the top navigation dropdown. |
| Leave approval and consumption | Pending → Approved/Refused requests; pending → Approved allocations. Approval checks policy, validity and remaining balance. |
| Two-step payrun wizard | Scope/period first; explicit eligible employee selection second. No payrun is saved by Continue. |
| Salary structures and rules | Editable structures group selected rules; rule order controls computation. |
| Flexible salary calculation | Fixed amounts, percentages of WAGE/earlier codes, restricted arithmetic formulas. No arbitrary code execution. |
| Payrun lifecycle | Draft → Computed → Validated → Paid, with recomputation restrictions and immutable finalized salary snapshots. |
| Payslip detail and output | Salary component breakdown, gross/deduction/net totals, browser print/Save PDF and CSV exports. |
| Persistence | Normalized local PostgreSQL tables, revision conflict detection and bounded internal action history. |

## Explicitly deferred

1. Admin-created accounts, authentication, and server-side role/record permissions.
2. Email delivery and bulk PDF attachments.
3. Payroll regulations, tax localization, contributions and real payment integrations.
4. Partial-month contract changes, proration, overtime and unpaid-leave payroll integration.
5. Multiple shifts, overnight attendance, leave holidays and business-day duration policies.
6. Richer rule categories and attendance variables; Python snippets are not executed.
7. Multi-company support and historical employee/department snapshots.
8. Automated tests, browser QA, production build, migration generation and deployment, left to the team as requested.

## Suggested team verification

These are suggestions for your team; they were not executed on the completed code.

- Initialize the database, open the app, edit a record, reload, and confirm persistence.
- Compare dashboard aggregates before/after computing, validating and marking a run paid.
- Try validation with Neha's missing bank reference; fix it and validate again.
- Confirm duplicate employee/period payroll cannot be created.
- Try overlapping contract dates and an unsupported partial-month contract.
- Create a salary formula using an earlier rule, then try an unknown identifier and division by zero.
- Approve a leave request and confirm the allocation decreases once; insufficient balances should block approval.
- Check that Continue/Back/Cancel in the wizard create no records.
- Confirm finalized payslips do not change when rules are edited for future payroll.
- Open employee records from cards and lists and verify smart-button filters.
- Check layouts on a narrow screen and keyboard access to dialogs/dropdowns.
- Print a payslip and check the saved PDF layout.
