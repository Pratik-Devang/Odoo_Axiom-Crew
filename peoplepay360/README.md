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
The application runs directly against your local PostgreSQL database configured via `DATABASE_URL` in `.env.local` without any Cloudflare or Wrangler dependencies.

The local database setup creates the schema only. The first API read inserts the fictional OXP sample company if no workspace exists. Reopening the app does not reset existing records. Wrangler and the development server share the local `.wrangler/state` database directory; run both from this project folder. No external database account is needed for local development.

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
7. Open a payslip and use **Print / Save PDF**. Choose your browser's Save as PDF destination.

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

- React 19 + TypeScript, using the Vinext/Vite scaffold.
- CSS and the included Shadcn/Base UI primitives; Lucide icons.
- Cloudflare D1-compatible local SQLite persistence and server route handlers.
- `app/page.tsx`: navigation, record screens, detail views, payrun wizard and dialogs.
- `components/payroll-dashboard.tsx`: filtered aggregates and dashboard charts.
- `components/record-form.tsx`: employee, contract, attendance, leave, rule and schedule forms.
- `components/peoplepay-ui.tsx`: shared controls, tables, formatting and CSV export.
- `lib/domain.ts`: data types, fictional seed data, salary expression evaluator and calculations.
- `lib/actions.ts`: server-side validation and workflow transitions.
- `app/api/workspace/route.ts`: load and mutate API.
- `db/store.ts`: persistence with optimistic revision checks.
- `db/schema.ts`: Drizzle schema definition.
- `db/bootstrap.sql`: local schema initialization.
- `REQUIREMENTS.md`: source requirements, implemented scope and remaining work.

For the prototype, the connected workspace is stored as one JSON aggregate in a SQLite row. A revision check makes each mutation atomic and rejects concurrent lost updates. This is deliberately simpler than a production relational HR schema. When expanding for the hackathon, split employees, contracts, attendance, allocations, requests, payruns and payslips into related tables with database constraints.

If two sessions edit concurrently, the later stale request returns a conflict. Reload the workspace, reopen the record and reapply the change. No client-provided whole-workspace replacement endpoint is exposed.

## Current boundaries

- Opens as a clearly labeled **demo administrator**. User creation, passwords and server-enforced roles are not implemented. Use fictional data; do not expose this version as a real multi-user HR service.
- Payslips use browser printing/Save as PDF. No email is sent. Bulk payroll exports are CSV, not email delivery.
- Sample salary components are demonstration rules, not statutory tax or contribution logic.
- Full-month contracts only; no partial-period wage proration.
- Leave uses inclusive calendar days. Hourly requests must be on one day. Weekend/holiday exclusion, approval chains and payroll-linked unpaid leave remain to implement.
- Attendance is one same-day record per employee/date. No overnight shifts or multiple daily sessions. The quick widget represents the demo administrator, Nisha Rao.
- Attendance is displayed on payslips but does not automatically alter monthly salary. Formula inputs currently include WAGE and earlier salary rule codes.
- Department and employee-type reporting joins the current employee record; historical department snapshots are a follow-up.
- Navigation uses URL hashes, so the workspace remains one React surface while individual screens are directly addressable.

## Hosting later

No build, publication, deployment, or completed-version testing was performed after your code-only instruction. A private, unpublished Sites registration was created earlier; its project ID is preserved in `.openai/hosting.json`. There is no deployed prototype URL. Local development does not require publishing.

For future hosted schema work, run `npm.cmd run db:generate` and review the generated Drizzle migration before deployment. The local `db:setup` bootstrap is not a substitute for versioned production migrations.

One optional, feature-detected WebMCP navigation tool is included; unsupported browsers ignore it. Its registration has not been tested.
