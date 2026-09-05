import { pgTable, text, integer, numeric, date, boolean, jsonb, timestamp, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';

// 1. Roles (RBAC)
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  permissions: jsonb('permissions').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2. Schedules
export const schedules = pgTable('schedules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('schedule_type').notNull().default('Fixed'),
  days: jsonb('days').notNull(),
  workRows: jsonb('work_rows').notNull().default([]),
  startTime: text('start_time').notNull().default('09:00'),
  endTime: text('end_time').notNull().default('18:00'),
  breakHours: numeric('break_hours').notNull().default('1.0'),
  weeklyHours: numeric('weekly_hours').notNull().default('0'),
  company: text('company').notNull().default('My Company'),
  timezone: text('timezone').notNull().default('Company timezone'),
  status: text('status').notNull().default('Active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 3. Employees
export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  department: text('department').notNull(),
  position: text('position').notNull(),
  type: text('type').notNull().default('Full-time'),
  status: text('status').notNull().default('Active'),
  manager: text('manager'),
  location: text('location').default('Mumbai'),
  scheduleId: text('schedule_id').references(() => schedules.id),
  bank: text('bank'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 4. Users (RBAC)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  roleId: text('role_id').notNull().references(() => roles.id),
  employeeId: text('employee_id').references(() => employees.id),
  password: text('password').default('welcome123'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 5. Salary Structures
export const salaryStructures = pgTable('salary_structures', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 6. Salary Rules
export const salaryRules = pgTable('salary_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  category: text('category').notNull(),
  sequence: integer('sequence').notNull().default(1),
  method: text('method').notNull().default('Fixed'),
  base: text('base'),
  value: numeric('value').default('0'),
  expression: text('expression'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 7. Salary Structure Rules (Junction)
export const salaryStructureRules = pgTable(
  'salary_structure_rules',
  {
    structureId: text('structure_id').notNull().references(() => salaryStructures.id),
    ruleId: text('rule_id').notNull().references(() => salaryRules.id),
  },
  (table) => [
    primaryKey({ columns: [table.structureId, table.ruleId] }),
  ]
);

// 8. Contracts
export const contracts = pgTable('contracts', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  wage: numeric('wage').notNull(),
  structureId: text('structure_id').references(() => salaryStructures.id),
  scheduleId: text('schedule_id').references(() => schedules.id),
  status: text('status').notNull().default('Running'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 9. Attendance
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  date: date('date').notNull(),
  checkIn: text('check_in'),
  checkOut: text('check_out'),
  workedHours: numeric('worked_hours').default('0'),
  edited: boolean('edited').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 10. Leave Types
export const leaveTypes = pgTable('leave_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('Days'),
  requiresAllocation: boolean('requires_allocation').notNull().default(true),
  approvalWorkflow: text('approval_workflow').notNull().default('HR Approval'),
  payrollImpact: text('payroll_impact').notNull().default('Paid'),
  payrollWorkEntry: text('payroll_work_entry'),
  displayColor: text('display_color').notNull().default('Blue'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 11. Leave Allocations
export const leaveAllocations = pgTable('leave_allocations', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  typeId: text('type_id').notNull().references(() => leaveTypes.id),
  amount: numeric('amount').notNull().default('0'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').notNull().default('Approved'),
  approver: text('approver'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 12. Leave Requests
export const leaveRequests = pgTable('leave_requests', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  typeId: text('type_id').notNull().references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  duration: numeric('duration').notNull().default('1'),
  reason: text('reason'),
  status: text('status').notNull().default('Pending'),
  approver: text('approver'),
  allocationId: text('allocation_id').references(() => leaveAllocations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 13. Payruns
export const payruns = pgTable('payruns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  period: text('period').notNull(),
  structureId: text('structure_id').references(() => salaryStructures.id),
  status: text('status').notNull().default('Draft'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 14. Payrun Employees (Junction)
export const payrunEmployees = pgTable(
  'payrun_employees',
  {
    payrunId: text('payrun_id').notNull().references(() => payruns.id),
    employeeId: text('employee_id').notNull().references(() => employees.id),
    period: text('period').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.payrunId, table.employeeId] }),
    uniqueIndex('uq_payrun_employee_period').on(table.employeeId, table.period),
  ]
);

// 15. Payslips
export const payslips = pgTable('payslips', {
  id: text('id').primaryKey(),
  payrunId: text('payrun_id').notNull().references(() => payruns.id),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  period: text('period').notNull(),
  structureId: text('structure_id'),
  contractId: text('contract_id'),
  basic: numeric('basic').notNull().default('0'),
  gross: numeric('gross').notNull().default('0'),
  deductions: numeric('deductions').notNull().default('0'),
  net: numeric('net').notNull().default('0'),
  workedDays: integer('worked_days').notNull().default(0),
  scheduledDays: numeric('scheduled_days').notNull().default('0'),
  unpaidLeaveDays: numeric('unpaid_leave_days').notNull().default('0'),
  payableDays: numeric('payable_days').notNull().default('0'),
  lines: jsonb('lines').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('uq_payslip_payrun_employee').on(table.payrunId, table.employeeId),
  uniqueIndex('uq_payslip_employee_period').on(table.employeeId, table.period),
]);

// 16. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  at: timestamp('at', { withTimezone: true }).defaultNow(),
  actor: text('actor').notNull(),
});

// Workspace revision & concurrency lock table
export const workspace = pgTable('workspace', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(0),
});

