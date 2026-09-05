-- ====================================================================
-- PeoplePay360: Full Relational Database Migration & RBAC System
-- Execute in pgAdmin 4 or via migration runner script
-- ====================================================================

BEGIN;

-- 1. RBAC: ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. WORK SCHEDULES
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL DEFAULT 'Fixed',
    days JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    work_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_time VARCHAR(10) NOT NULL DEFAULT '09:00',
    end_time VARCHAR(10) NOT NULL DEFAULT '18:00',
    break_hours NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    weekly_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) NOT NULL DEFAULT 'Fixed';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS work_rows JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC(6,2) NOT NULL DEFAULT 0;

UPDATE schedules AS schedule
SET work_rows = (
    SELECT jsonb_agg(jsonb_build_object(
        'id', weekday.name,
        'day', weekday.name,
        'working', schedule.days ? weekday.name,
        'start', schedule.start_time,
        'end', schedule.end_time,
        'breakHours', schedule.break_hours
    ) ORDER BY weekday.position)
    FROM (VALUES
        (0, 'Sunday'), (1, 'Monday'), (2, 'Tuesday'), (3, 'Wednesday'),
        (4, 'Thursday'), (5, 'Friday'), (6, 'Saturday')
    ) AS weekday(position, name)
)
WHERE work_rows = '[]'::jsonb;

UPDATE schedules AS schedule
SET weekly_hours = COALESCE((
    SELECT ROUND(SUM(
        EXTRACT(EPOCH FROM ((work_row->>'end')::time - (work_row->>'start')::time)) / 3600
        - COALESCE((work_row->>'breakHours')::numeric, 0)
    ), 2)
    FROM jsonb_array_elements(schedule.work_rows) AS work_row
    WHERE COALESCE((work_row->>'working')::boolean, false)
), 0);

-- 3. EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Full-time',
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    manager VARCHAR(150),
    location VARCHAR(100) DEFAULT 'Mumbai',
    schedule_id VARCHAR(50) REFERENCES schedules(id) ON DELETE SET NULL,
    bank VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. RBAC: USERS TABLE (Linked to Employee & Role)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
    password VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade databases created before login support was introduced.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 5. SALARY STRUCTURES
CREATE TABLE IF NOT EXISTS salary_structures (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SALARY RULES
CREATE TABLE IF NOT EXISTS salary_rules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Basic', 'Allowance', 'Deduction'
    sequence INTEGER NOT NULL DEFAULT 1,
    method VARCHAR(50) NOT NULL DEFAULT 'Fixed', -- 'Fixed', 'Percentage', 'Formula'
    base VARCHAR(50),
    value NUMERIC(12,2) DEFAULT 0,
    expression TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. STRUCTURE-RULES (Junction table)
CREATE TABLE IF NOT EXISTS salary_structure_rules (
    structure_id VARCHAR(50) REFERENCES salary_structures(id) ON DELETE CASCADE,
    rule_id VARCHAR(50) REFERENCES salary_rules(id) ON DELETE CASCADE,
    PRIMARY KEY (structure_id, rule_id)
);

-- 8. EMPLOYMENT CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    wage NUMERIC(12,2) NOT NULL,
    structure_id VARCHAR(50) REFERENCES salary_structures(id) ON DELETE SET NULL,
    schedule_id VARCHAR(50) REFERENCES schedules(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Running',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in VARCHAR(10),
    check_out VARCHAR(10),
    worked_hours NUMERIC(5,2) DEFAULT 0,
    edited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_date UNIQUE (employee_id, date)
);

-- 10. LEAVE POLICIES / TYPES
CREATE TABLE IF NOT EXISTS leave_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'Days', -- 'Days', 'Hours'
    requires_allocation BOOLEAN NOT NULL DEFAULT true,
    approval_workflow VARCHAR(50) NOT NULL DEFAULT 'HR Approval',
    payroll_impact VARCHAR(50) NOT NULL DEFAULT 'Paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS approval_workflow VARCHAR(50) NOT NULL DEFAULT 'HR Approval';
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS payroll_impact VARCHAR(50) NOT NULL DEFAULT 'Paid';

-- 11. LEAVE ALLOCATIONS
CREATE TABLE IF NOT EXISTS leave_allocations (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type_id VARCHAR(50) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    amount NUMERIC(5,2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type_id VARCHAR(50) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration NUMERIC(5,2) NOT NULL DEFAULT 1,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    approver VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. PAYRUNS
CREATE TABLE IF NOT EXISTS payruns (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    period VARCHAR(10) NOT NULL, -- e.g. '2026-09'
    structure_id VARCHAR(50) REFERENCES salary_structures(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Computed', 'Validated', 'Paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. PAYRUN EMPLOYEES (Junction table)
CREATE TABLE IF NOT EXISTS payrun_employees (
    payrun_id VARCHAR(50) REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    PRIMARY KEY (payrun_id, employee_id)
);

-- 15. PAYSLIPS
CREATE TABLE IF NOT EXISTS payslips (
    id VARCHAR(50) PRIMARY KEY,
    payrun_id VARCHAR(50) NOT NULL REFERENCES payruns(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL,
    structure_id VARCHAR(50),
    contract_id VARCHAR(50),
    basic NUMERIC(12,2) NOT NULL DEFAULT 0,
    gross NUMERIC(12,2) NOT NULL DEFAULT 0,
    deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net NUMERIC(12,2) NOT NULL DEFAULT 0,
    worked_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    unpaid_leave_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    payable_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    lines JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS scheduled_days NUMERIC(6,2) NOT NULL DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS unpaid_leave_days NUMERIC(6,2) NOT NULL DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payable_days NUMERIC(6,2) NOT NULL DEFAULT 0;

-- ====================================================================
-- SEED RBAC ROLES
-- ====================================================================
INSERT INTO roles (id, name, description, permissions)
VALUES 
    ('admin', 'Super Administrator', 'Full access to all system modules, configurations, and user management', 
     '["*"]'::jsonb),
    ('hr_manager', 'HR Manager', 'Manage employees, employment contracts, attendance, and leave approvals', 
     '["employees:read","employees:write","contracts:read","contracts:write","attendance:read","attendance:write","leaves:approve"]'::jsonb),
    ('finance_manager', 'Finance & Payroll Manager', 'Compute payruns, validate salary disbursement, export banking files', 
     '["payroll:read","payroll:compute","payroll:validate","payroll:pay","employees:read","contracts:read"]'::jsonb),
    ('payroll_manager', 'HR Payroll Manager', 'Full HR and payroll access, including salary configuration',
     '["hr:*","payroll:*"]'::jsonb),
    ('payroll_user', 'HR Payroll User', 'HR access plus payrun and payslip processing with read-only salary configuration',
     '["hr:*","payroll:read","payroll:compute","config:read"]'::jsonb),
    ('employee', 'Standard Employee', 'Personal profile, self attendance clocking, and leave requests', 
     '["self:read","attendance:clock","leaves:request"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- DATA MIGRATION: UNPACK FROM workspace.data JSON IF IT EXISTS
-- ====================================================================
DO $$
DECLARE
    w_json JSONB;
BEGIN
    SELECT data::jsonb INTO w_json FROM workspace WHERE id = 'demo' LIMIT 1;

    -- Import the legacy JSON only when the normalized database is empty.
    -- Re-importing it on every migration can resurrect obsolete payslip UUIDs.
    IF w_json IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employees) THEN
        -- 1. Schedules
        INSERT INTO schedules (id, name, schedule_type, days, work_rows, start_time, end_time, break_hours, weekly_hours)
        SELECT 
            x->>'id',
            x->>'name',
            COALESCE(x->>'type', 'Fixed'),
            COALESCE(x->'days', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb),
            COALESCE(x->'workRows', '[]'::jsonb),
            COALESCE(x->>'start', '09:00'),
            COALESCE(x->>'end', '18:00'),
            COALESCE((x->>'breakHours')::numeric, 1.0),
            COALESCE((x->>'weeklyHours')::numeric, 0)
        FROM jsonb_array_elements(w_json->'schedules') AS x
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            schedule_type = EXCLUDED.schedule_type,
            days = EXCLUDED.days,
            work_rows = EXCLUDED.work_rows,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            break_hours = EXCLUDED.break_hours,
            weekly_hours = EXCLUDED.weekly_hours;

        -- 2. Employees
        INSERT INTO employees (id, name, email, phone, department, position, type, status, manager, location, schedule_id, bank)
        SELECT 
            x->>'id',
            x->>'name',
            x->>'email',
            x->>'phone',
            x->>'department',
            x->>'position',
            COALESCE(x->>'type', 'Full-time'),
            COALESCE(x->>'status', 'Active'),
            x->>'manager',
            COALESCE(x->>'location', 'Mumbai'),
            x->>'scheduleId',
            x->>'bank'
        FROM jsonb_array_elements(w_json->'employees') AS x
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            department = EXCLUDED.department,
            position = EXCLUDED.position,
            type = EXCLUDED.type,
            status = EXCLUDED.status,
            manager = EXCLUDED.manager,
            location = EXCLUDED.location,
            schedule_id = EXCLUDED.schedule_id,
            bank = EXCLUDED.bank;

        -- Seed initial admin user tied to employee e6 (Nisha Rao)
        INSERT INTO users (id, email, name, role_id, employee_id)
        VALUES ('u1', 'nisha@oxp.example', 'Nisha Rao', 'finance_manager', 'e6')
        ON CONFLICT (id) DO NOTHING;

        -- 3. Salary Structures
        INSERT INTO salary_structures (id, name, active)
        SELECT 
            x->>'id',
            x->>'name',
            COALESCE((x->>'active')::boolean, true)
        FROM jsonb_array_elements(w_json->'structures') AS x
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active;

        -- 4. Salary Rules
        INSERT INTO salary_rules (id, name, code, category, sequence, method, base, value, expression)
        SELECT 
            x->>'id',
            x->>'name',
            x->>'code',
            x->>'category',
            COALESCE((x->>'sequence')::integer, 1),
            COALESCE(x->>'method', 'Fixed'),
            x->>'base',
            COALESCE((x->>'value')::numeric, 0),
            x->>'expression'
        FROM jsonb_array_elements(w_json->'rules') AS x
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            code = EXCLUDED.code,
            category = EXCLUDED.category,
            sequence = EXCLUDED.sequence,
            method = EXCLUDED.method,
            base = EXCLUDED.base,
            value = EXCLUDED.value,
            expression = EXCLUDED.expression;

        -- 5. Salary Structure Rules
        INSERT INTO salary_structure_rules (structure_id, rule_id)
        SELECT 
            s->>'id',
            r.rule_id
        FROM jsonb_array_elements(w_json->'structures') AS s,
        LATERAL jsonb_array_elements_text(s->'ruleIds') AS r(rule_id)
        ON CONFLICT (structure_id, rule_id) DO NOTHING;

        -- 6. Contracts
        INSERT INTO contracts (id, employee_id, start_date, end_date, wage, structure_id, schedule_id, status)
        SELECT 
            x->>'id',
            x->>'employeeId',
            (x->>'start')::date,
            NULLIF(x->>'end', '')::date,
            COALESCE((x->>'wage')::numeric, 0),
            x->>'structureId',
            x->>'scheduleId',
            COALESCE(x->>'status', 'Running')
        FROM jsonb_array_elements(w_json->'contracts') AS x
        ON CONFLICT (id) DO UPDATE SET
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            wage = EXCLUDED.wage,
            structure_id = EXCLUDED.structure_id,
            schedule_id = EXCLUDED.schedule_id,
            status = EXCLUDED.status;

        -- 7. Leave Types
        INSERT INTO leave_types (id, name, unit, requires_allocation, approval_workflow, payroll_impact)
        SELECT 
            x->>'id',
            x->>'name',
            COALESCE(x->>'unit', 'Days'),
            COALESCE((x->>'requiresAllocation')::boolean, true),
            COALESCE(x->>'approvalWorkflow', 'HR Approval'),
            COALESCE(x->>'payrollImpact', 'Paid')
        FROM jsonb_array_elements(w_json->'leaveTypes') AS x
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            unit = EXCLUDED.unit,
            requires_allocation = EXCLUDED.requires_allocation,
            approval_workflow = EXCLUDED.approval_workflow,
            payroll_impact = EXCLUDED.payroll_impact;

        -- 8. Leave Allocations
        INSERT INTO leave_allocations (id, employee_id, type_id, amount, start_date, end_date, status)
        SELECT 
            x->>'id',
            x->>'employeeId',
            x->>'typeId',
            COALESCE((x->>'amount')::numeric, 0),
            (x->>'start')::date,
            (x->>'end')::date,
            COALESCE(x->>'status', 'Approved')
        FROM jsonb_array_elements(w_json->'allocations') AS x
        ON CONFLICT (id) DO UPDATE SET
            amount = EXCLUDED.amount,
            status = EXCLUDED.status;

        -- 9. Leave Requests
        INSERT INTO leave_requests (id, employee_id, type_id, start_date, end_date, duration, reason, status, approver)
        SELECT 
            x->>'id',
            x->>'employeeId',
            x->>'typeId',
            (x->>'start')::date,
            (x->>'end')::date,
            COALESCE((x->>'duration')::numeric, 1),
            x->>'reason',
            COALESCE(x->>'status', 'Pending'),
            x->>'approver'
        FROM jsonb_array_elements(w_json->'requests') AS x
        ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            approver = EXCLUDED.approver;

        -- 10. Attendance
        INSERT INTO attendance (id, employee_id, date, check_in, check_out, worked_hours, edited)
        SELECT 
            x->>'id',
            x->>'employeeId',
            (x->>'date')::date,
            x->>'checkIn',
            x->>'checkOut',
            0,
            COALESCE((x->>'edited')::boolean, false)
        FROM jsonb_array_elements(w_json->'attendance') AS x
        ON CONFLICT (id) DO NOTHING;

        -- 11. Payruns
        INSERT INTO payruns (id, name, period, structure_id, status)
        SELECT 
            x->>'id',
            x->>'name',
            x->>'period',
            x->>'structureId',
            COALESCE(x->>'status', 'Draft')
        FROM jsonb_array_elements(w_json->'payruns') AS x
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

        -- 12. Payrun Employees
        INSERT INTO payrun_employees (payrun_id, employee_id)
        SELECT 
            p->>'id',
            e.employee_id
        FROM jsonb_array_elements(w_json->'payruns') AS p,
        LATERAL jsonb_array_elements_text(p->'employeeIds') AS e(employee_id)
        ON CONFLICT (payrun_id, employee_id) DO NOTHING;

        -- 13. Payslips
        INSERT INTO payslips (id, payrun_id, employee_id, period, structure_id, contract_id, basic, gross, deductions, net, worked_days, scheduled_days, unpaid_leave_days, payable_days, lines)
        SELECT 
            slip->>'id',
            p->>'id',
            slip->>'employeeId',
            slip->>'period',
            slip->>'structureId',
            slip->>'contractId',
            COALESCE((slip->>'basic')::numeric, 0),
            COALESCE((slip->>'gross')::numeric, 0),
            COALESCE((slip->>'deductions')::numeric, 0),
            COALESCE((slip->>'net')::numeric, 0),
            COALESCE((slip->>'workedDays')::integer, 0),
            COALESCE((slip->>'scheduledDays')::numeric, 0),
            COALESCE((slip->>'unpaidLeaveDays')::numeric, 0),
            COALESCE((slip->>'payableDays')::numeric, 0),
            COALESCE(slip->'lines', '[]'::jsonb)
        FROM jsonb_array_elements(w_json->'payruns') AS p,
        LATERAL jsonb_array_elements(p->'slips') AS slip
        ON CONFLICT (id) DO UPDATE SET
            net = EXCLUDED.net,
            gross = EXCLUDED.gross,
            deductions = EXCLUDED.deductions,
            scheduled_days = EXCLUDED.scheduled_days,
            unpaid_leave_days = EXCLUDED.unpaid_leave_days,
            payable_days = EXCLUDED.payable_days;
    END IF;
END $$;

-- JSON workspaces created before per-day schedules existed import an empty
-- work_rows array. Normalize those rows after the JSON migration as well.
UPDATE schedules AS schedule
SET work_rows = (
    SELECT jsonb_agg(jsonb_build_object(
        'id', weekday.name,
        'day', weekday.name,
        'working', schedule.days ? weekday.name,
        'start', schedule.start_time,
        'end', schedule.end_time,
        'breakHours', schedule.break_hours
    ) ORDER BY weekday.position)
    FROM (VALUES
        (0, 'Sunday'), (1, 'Monday'), (2, 'Tuesday'), (3, 'Wednesday'),
        (4, 'Thursday'), (5, 'Friday'), (6, 'Saturday')
    ) AS weekday(position, name)
)
WHERE work_rows = '[]'::jsonb;

UPDATE schedules AS schedule
SET weekly_hours = COALESCE((
    SELECT ROUND(SUM(
        EXTRACT(EPOCH FROM ((work_row->>'end')::time - (work_row->>'start')::time)) / 3600
        - COALESCE((work_row->>'breakHours')::numeric, 0)
    ), 2)
    FROM jsonb_array_elements(schedule.work_rows) AS work_row
    WHERE COALESCE((work_row->>'working')::boolean, false)
), 0);

-- Demo credentials are stored as scrypt hashes. Existing password hashes are
-- never overwritten when the migration is re-run.
INSERT INTO users (id, email, name, role_id, employee_id, password, active)
VALUES
    ('u_admin', 'admin@oxp.example', 'Demo Administrator', 'admin', NULL, 'scrypt$f23d82845a806df241886dbe51c90c6e$46f07cdf1afff856653d76e793923d72b8170640e14bd713edd491c23d89d9daca59d3bd7a17716b08413817367b39a431dba90ccc047d95783663a672509dae', true),
    ('u_payroll_manager', 'nisha@oxp.example', 'Nisha Rao', 'payroll_manager', (SELECT id FROM employees WHERE id = 'e6'), 'scrypt$92c64f1c93cc465ca090501c6e205685$0901b45dc2faf475fc7f23afb7a80a20274085d06746d3c73fc058afa2bbdee134880d06b7eb1aade7f061026b73f4ecc3c66393c951a86c448cc3d17fc32815', true),
    ('u_payroll_user', 'payroll.user@oxp.example', 'Payroll User', 'payroll_user', NULL, 'scrypt$a601935fe6b6129606a9c711c9958601$132d1db4f50c6399a231c10e5d8bed512109bff193837bcbacf3a745d8b55b40607ada6903b17a95f522c04fef48fb102424c1a897bb9e5f649ea6e3b9d8ce27', true),
    ('u_hr_manager', 'sara@oxp.example', 'Sara Khan', 'hr_manager', (SELECT id FROM employees WHERE id = 'e1'), 'scrypt$e9ebb8c09b3381be908d36314b6d931b$8c042b4a61b0e3afc1917261811dad8317915876e7534f5899737c6725e548f2010739a8467f8513212ecab6fe91ebda246726a67613e48cca0468263fef4856', true),
    ('u_employee', 'john@oxp.example', 'John Dsouza', 'employee', (SELECT id FROM employees WHERE id = 'e2'), 'scrypt$3eaa57da8c5119c658b757e748fb5019$8ff65eb3e21c7c51e88020b262fc7e1d7675b0f7b9a1216d188045c077cafc5dccce995a4fccf5ad1a7709c19d57c5a1d2510b40544f7314754d0c3592c7e5dc', true)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role_id = EXCLUDED.role_id,
    employee_id = COALESCE(EXCLUDED.employee_id, users.employee_id),
    password = COALESCE(users.password, EXCLUDED.password),
    active = true;

-- ====================================================================
-- CONVENIENCE VIEWS FOR PGADMIN 4
-- ====================================================================

-- View 1: Employee Directory Overview
CREATE OR REPLACE VIEW v_employees_overview AS
SELECT 
    e.id,
    e.name,
    e.email,
    e.department,
    e.position,
    e.type,
    e.status,
    e.manager,
    c.wage AS monthly_wage,
    c.status AS contract_status,
    s.name AS schedule_name
FROM employees e
LEFT JOIN contracts c ON c.employee_id = e.id AND c.status = 'Running'
LEFT JOIN schedules s ON s.id = e.schedule_id;

-- View 2: Monthly Payroll Overview
CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT 
    p.id AS payrun_id,
    p.name AS payrun_name,
    p.period,
    p.status AS payrun_status,
    COUNT(ps.id) AS total_slips,
    COALESCE(SUM(ps.gross), 0) AS total_gross,
    COALESCE(SUM(ps.deductions), 0) AS total_deductions,
    COALESCE(SUM(ps.net), 0) AS total_net
FROM payruns p
LEFT JOIN payslips ps ON ps.payrun_id = p.id
GROUP BY p.id, p.name, p.period, p.status
ORDER BY p.period DESC;

-- View 3: Attendance Daily Summary
CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT 
    a.date,
    COUNT(a.id) AS total_scheduled,
    COUNT(a.check_in) AS total_present,
    COUNT(a.id) - COUNT(a.check_in) AS total_absent
FROM attendance a
GROUP BY a.date
ORDER BY a.date DESC;

COMMIT;
