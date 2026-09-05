# PeoplePay360

A code-first HR and payroll prototype based on the PeoplePay360 PDF and the supplied **HRMS OXP - 24 hours.excalidraw**. The dashboard is the entry point; employee, attendance, leave, and payroll actions operate on persistent server data.

## Run locally

Use Node.js 22.13 or later. From this folder:

```powershell
npm.cmd install
npm.cmd run db:setup
npm.cmd run dev
```bash
npm install
npm run dev
```

Open the local URL printed by the development server (normally http://localhost:3000).

`npm.cmd` avoids PowerShell's script-execution restriction on `npm.ps1`. On macOS/Linux, use `npm` instead. Dependencies are already installed in this checkout; installation is needed for another machine or a fresh clone.
The application runs directly against your local PostgreSQL database configured via `DATABASE_URL` in `.env.local` without any Cloudflare or Wrangler dependencies. Set a random `JWT_SECRET` containing at least 32 characters.

For bulk payslip email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and optional `SMTP_USER`, `SMTP_PASS`, and `SMTP_SECURE`. A local MailHog server normally uses port `1025` without authentication.

Create a local PostgreSQL database named `peoplepay360` and set `DATABASE_URL` in `.env.local` before running `db:setup`. The setup command creates the relational schema. The first API read inserts the fictional OXP sample company only when the employee tables are empty. Reopening the app does not reset existing records.

## Your build and checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

The completed implementation has **not been built or tested**, per your request. An early dashboard slice was briefly served before that instruction; the development server was stopped. A Drizzle generation attempt made before your instruction failed in the environment (`uv_os_get_passwd`). The local bootstrap SQL is included so you can initialize the prototype directly.

## Demo flows

### 1. Resolve a warning and complete payroll

1. The overview opens on September 2026, with computed example payslips and historical paid runs from April through August.
2. Open **Employees → Employees**, select **Neha Patel**, then **Edit employee**.
3. Add a fictional bank account reference and save.
4. Open **Payroll → Payruns**, then **September 2026**.
5. Review the generated payslips; use **Compute** to recompute if desired.
6. **Validate**, then **Mark paid**. The dashboard's paid totals now reflect that transition.
7. Open a payslip and use **Download PDF**, or use **Send Payslips** on a validated/paid payrun to email all generated PDFs.

“Mark paid” records a status. It never initiates a bank transfer.

### 2. Create a new payrun

1. Choose **New payrun**. The default month is October 2026.
2. Select a salary structure and period; **Continue** only changes wizard step.
3. Explicitly select eligible employees, then **Create payrun**.
4. Compute, resolve warnings, validate, and mark paid.

Eligibility requires an active employee and one contract covering the full month, matching the chosen structure. Employees already included in another run for that month are excluded. Contract changes within a month are intentionally rejected in this first prototype.

### 3. Leave request to updated balance

1. Open **Time Off → Requests** and select John Dsouza's pending request.
2. Approve it. His approved allocation is reduced by three days.
3. View **Time Off → Allocations** or his employee profile to see the updated balance.
4. New allocations remain pending until explicitly approved. Requests without sufficient approved allocation cannot be approved.

### 4. Employee and salary configuration

1. Create an employee, then use the profile's **Contracts** smart button to add a contract.
2. Create/edit salary rules under **Payroll → Salary rules**.
3. Add those rules to a structure under **Payroll → Salary structures**.
4. Select that structure in the payrun wizard. Fixed, percentage, and arithmetic formula rules drive the computed payslips in sequence.

Changing contracts, attendance, salary rules, or structures invalidates unfinalized computed payslips. Recompute them to use the new configuration. Validated/paid salary snapshots are preserved.

## Stack and source map

- Next.js 16 + React 19 + TypeScript, running on the local Node.js server.
- CSS and the included Shadcn/Base UI primitives; Lucide icons.
- Local PostgreSQL persistence through Node.js route handlers.
- `app/page.tsx`: navigation, record screens, detail views, payrun wizard and dialogs.
- `components/payroll-dashboard.tsx`: filtered aggregates and dashboard charts.
- `components/record-form.tsx`: employee, contract, attendance, leave, rule and schedule forms.
- `components/peoplepay-ui.tsx`: shared controls, tables, formatting and CSV export.
- `lib/domain.ts`: data types, fictional seed data, salary expression evaluator and calculations.
- `lib/actions.ts`: server-side validation and workflow transitions.
- `app/api/workspace/route.ts`: load and mutate API.
- `db/store.ts`: persistence with optimistic revision checks.
- `db/schema.ts`: Drizzle schema definition.
- `db/setup-postgres.sql` and `db/relational-migration.sql`: local PostgreSQL schema initialization.
- `REQUIREMENTS.md`: source requirements, implemented scope and remaining work.

Employees, contracts, attendance, leave, salary structures, payruns and payslips are stored in normalized PostgreSQL tables. The `workspace` row keeps the revision used to reject concurrent lost updates. API reads reconstruct the workspace from the relational tables, so committed changes made through pgAdmin appear after a reload.

If two sessions edit concurrently, the later stale request returns a conflict. Reload the workspace, reopen the record and reapply the change. No client-provided whole-workspace replacement endpoint is exposed.

## Current boundaries

- Provides local password authentication, admin-managed user accounts and server-enforced role and employee record scopes. The seeded accounts and data are for demonstration and should be replaced before real use.
- Payslips are generated as PDF files. Bulk delivery requires an SMTP server configured through the environment variables above.
- Sample salary components are demonstration rules, not statutory tax or contribution logic.
- Full-month contracts only; no partial-period wage proration.
- Day-based leave counts the employee's scheduled working days. Hourly requests must be on one scheduled working day. Leave types support automatic, manager and HR approval policies plus paid, unpaid and no-payroll-impact treatments. Approved unpaid leave creates a prorated payslip deduction.
- Public-holiday calendars and role-specific multi-stage approval chains remain to implement.
- Attendance is one same-day record per employee/date. No overnight shifts or multiple daily sessions. The quick widget represents the demo administrator, Nisha Rao.
- Attendance is displayed on payslips but does not automatically alter monthly salary. Formula inputs currently include WAGE and earlier salary rule codes.
- Department and employee-type reporting joins the current employee record; historical department snapshots are a follow-up.
- Navigation uses URL hashes, so the workspace remains one React surface while individual screens are directly addressable.

## Local runtime

The prototype runs through `next dev` and connects directly to the PostgreSQL instance in `.env.local`. No Cloudflare, Wrangler, D1, Sites, or deployment configuration is required.

One optional, feature-detected WebMCP navigation tool is included; unsupported browsers ignore it. Its registration has not been tested.
