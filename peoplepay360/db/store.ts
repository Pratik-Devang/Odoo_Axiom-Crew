import { seed, type Workspace } from '@/lib/domain';
import { getPgPool } from './index';
import type { Pool, PoolClient } from 'pg';

let schemaEnsured = false;

async function ensureSchema(client: PoolClient) {
  if (schemaEnsured) return;
  try {
    await client.query(`
      ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS approval_workflow VARCHAR(50) NOT NULL DEFAULT 'HR Approval';
      ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS payroll_impact VARCHAR(50) NOT NULL DEFAULT 'Paid';
      ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS payroll_work_entry VARCHAR(255) DEFAULT '';
      ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS display_color VARCHAR(50) DEFAULT 'Blue';
      ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

      ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approver VARCHAR(255) DEFAULT '';
      ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS allocation_id VARCHAR(255) DEFAULT '';

      ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS approver VARCHAR(255) DEFAULT '';

      ALTER TABLE payruns ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime NUMERIC(5,2) DEFAULT 0;

      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS company VARCHAR(100) NOT NULL DEFAULT 'My Company';
      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'Company timezone';
      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Active';

      INSERT INTO schedules (id, name, schedule_type, days, work_rows, start_time, end_time, break_hours, weekly_hours, company, timezone, status)
      VALUES
        ('sch1', 'Standard Full-Time (40h)', 'Fixed', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb, '[{"id":"Monday","day":"Monday","working":true,"start":"09:00","end":"18:00","breakHours":1},{"id":"Tuesday","day":"Tuesday","working":true,"start":"09:00","end":"18:00","breakHours":1},{"id":"Wednesday","day":"Wednesday","working":true,"start":"09:00","end":"18:00","breakHours":1},{"id":"Thursday","day":"Thursday","working":true,"start":"09:00","end":"18:00","breakHours":1},{"id":"Friday","day":"Friday","working":true,"start":"09:00","end":"18:00","breakHours":1}]'::jsonb, '09:00', '18:00', 1.0, 40.0, 'Axiom Crew Tech Pvt Ltd', 'Asia/Kolkata (IST)', 'Active'),
        ('sch2', 'Night Shift NOC (35h)', 'Shift', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb, '[{"id":"Monday","day":"Monday","working":true,"start":"22:00","end":"06:00","breakHours":1},{"id":"Tuesday","day":"Tuesday","working":true,"start":"22:00","end":"06:00","breakHours":1},{"id":"Wednesday","day":"Wednesday","working":true,"start":"22:00","end":"06:00","breakHours":1},{"id":"Thursday","day":"Thursday","working":true,"start":"22:00","end":"06:00","breakHours":1},{"id":"Friday","day":"Friday","working":true,"start":"22:00","end":"06:00","breakHours":1}]'::jsonb, '22:00', '06:00', 1.0, 35.0, 'Axiom Crew Global Ops', 'Asia/Kolkata (IST)', 'Active'),
        ('sch3', 'Retail & Weekend Shift (32h)', 'Shift', '["Thursday","Friday","Saturday","Sunday"]'::jsonb, '[{"id":"Thursday","day":"Thursday","working":true,"start":"10:00","end":"19:00","breakHours":1},{"id":"Friday","day":"Friday","working":true,"start":"10:00","end":"19:00","breakHours":1},{"id":"Saturday","day":"Saturday","working":true,"start":"10:00","end":"19:00","breakHours":1},{"id":"Sunday","day":"Sunday","working":true,"start":"10:00","end":"19:00","breakHours":1}]'::jsonb, '10:00', '19:00', 1.0, 32.0, 'Axiom Crew Retail', 'Asia/Kolkata (IST)', 'Active'),
        ('sch4', 'Flexible Hybrid 4-Day (36h)', 'Flexible', '["Monday","Tuesday","Wednesday","Thursday"]'::jsonb, '[{"id":"Monday","day":"Monday","working":true,"start":"08:30","end":"18:00","breakHours":0.5},{"id":"Tuesday","day":"Tuesday","working":true,"start":"08:30","end":"18:00","breakHours":0.5},{"id":"Wednesday","day":"Wednesday","working":true,"start":"08:30","end":"18:00","breakHours":0.5},{"id":"Thursday","day":"Thursday","working":true,"start":"08:30","end":"18:00","breakHours":0.5}]'::jsonb, '08:30', '18:00', 0.5, 36.0, 'Axiom Crew Tech Pvt Ltd', 'Asia/Kolkata (IST)', 'Active'),
        ('sch5', 'Morning Part-Time (20h)', 'Fixed', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb, '[{"id":"Monday","day":"Monday","working":true,"start":"09:00","end":"13:00","breakHours":0},{"id":"Tuesday","day":"Tuesday","working":true,"start":"09:00","end":"13:00","breakHours":0},{"id":"Wednesday","day":"Wednesday","working":true,"start":"09:00","end":"13:00","breakHours":0},{"id":"Thursday","day":"Thursday","working":true,"start":"09:00","end":"13:00","breakHours":0},{"id":"Friday","day":"Friday","working":true,"start":"09:00","end":"13:00","breakHours":0}]'::jsonb, '09:00', '13:00', 0.0, 20.0, 'Axiom Crew Tech Pvt Ltd', 'Asia/Kolkata (IST)', 'Active'),
        ('sch6', 'Seasonal Logistics Standby (18h)', 'Flexible', '["Friday","Saturday","Sunday"]'::jsonb, '[{"id":"Friday","day":"Friday","working":true,"start":"12:00","end":"18:30","breakHours":0.5},{"id":"Saturday","day":"Saturday","working":true,"start":"12:00","end":"18:30","breakHours":0.5},{"id":"Sunday","day":"Sunday","working":true,"start":"12:00","end":"18:30","breakHours":0.5}]'::jsonb, '12:00', '18:30', 0.5, 18.0, 'Axiom Crew Logistics', 'Asia/Kolkata (IST)', 'Inactive')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        schedule_type = EXCLUDED.schedule_type,
        days = EXCLUDED.days,
        work_rows = EXCLUDED.work_rows,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        break_hours = EXCLUDED.break_hours,
        weekly_hours = EXCLUDED.weekly_hours,
        company = EXCLUDED.company,
        timezone = EXCLUDED.timezone,
        status = EXCLUDED.status;

      ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_employee_id VARCHAR(50);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_phone VARCHAR(50);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS government_id_type VARCHAR(50);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS government_id_number VARCHAR(150);

      CREATE TABLE IF NOT EXISTS user_roles (
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id)
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(80) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    schemaEnsured = true;
  } catch (err) {
    console.warn('Auto-schema check warning:', err);
  }
}

/**
 * Read the entire workspace from normalized PostgreSQL relational tables.
 */
type WorkspaceReadOptions = {
  attendancePeriod?: string;
};

async function readRelational(
  pool: Pool,
  options: WorkspaceReadOptions = {},
): Promise<Workspace> {
  // These collections are independent. Using the pool lets PostgreSQL execute
  // them concurrently instead of paying one network round trip after another.
  const [
    employeesRes,
    contractsRes,
    attendanceRes,
    requestsRes,
    allocationsRes,
    leaveTypesRes,
    rulesRes,
    structuresRes,
    schedulesRes,
    payrunsRes,
    payslipsRes,
    auditRes,
  ] = await Promise.all([
    pool.query(
      `SELECT id, name, email, COALESCE(phone, '') AS phone, department, position, type, status,
            COALESCE(manager, '') AS manager, manager_employee_id AS "managerEmployeeId",
            COALESCE(location, 'Mumbai') AS location, COALESCE(schedule_id, 'sch1') AS "scheduleId",
            COALESCE(bank, '') AS bank, personal_email AS "personalEmail", personal_phone AS "personalPhone",
            address, emergency_contact_name AS "emergencyContactName", emergency_contact_phone AS "emergencyContactPhone",
            government_id_type AS "governmentIdType", government_id_number AS "governmentIdNumber"
     FROM employees ORDER BY id`,
    ),
    pool.query(
      `SELECT id, employee_id AS "employeeId", to_char(start_date, 'YYYY-MM-DD') AS "start", COALESCE(to_char(end_date, 'YYYY-MM-DD'), '') AS "end", wage::float AS wage, COALESCE(structure_id, '') AS "structureId", COALESCE(schedule_id, '') AS "scheduleId", status FROM contracts ORDER BY id`,
    ),
    options.attendancePeriod
      ? pool.query(
          `SELECT id, employee_id AS "employeeId", to_char(date, 'YYYY-MM-DD') AS "date",
                COALESCE(check_in, '') AS "checkIn", COALESCE(check_out, '') AS "checkOut",
                COALESCE(overtime::float, 0) AS overtime, edited
         FROM attendance
         WHERE date >= $1::date AND date < ($1::date + INTERVAL '1 month')
         ORDER BY date, employee_id`,
          [`${options.attendancePeriod}-01`],
        )
      : pool.query(
          `SELECT id, employee_id AS "employeeId", to_char(date, 'YYYY-MM-DD') AS "date",
                COALESCE(check_in, '') AS "checkIn", COALESCE(check_out, '') AS "checkOut",
                COALESCE(overtime::float, 0) AS overtime, edited
         FROM attendance ORDER BY date, employee_id`,
        ),
    pool.query(
      `SELECT id, employee_id AS "employeeId", type_id AS "typeId", to_char(start_date, 'YYYY-MM-DD') AS "start", to_char(end_date, 'YYYY-MM-DD') AS "end", duration::float AS duration, COALESCE(reason, '') AS reason, status, COALESCE(approver, '') AS approver, COALESCE(allocation_id, '') AS "allocationId" FROM leave_requests ORDER BY id`,
    ),
    pool.query(
      `SELECT id, employee_id AS "employeeId", type_id AS "typeId", amount::float AS amount, to_char(start_date, 'YYYY-MM-DD') AS "start", to_char(end_date, 'YYYY-MM-DD') AS "end", status, COALESCE(approver, '') AS approver FROM leave_allocations ORDER BY id`,
    ),
    pool.query(
      'SELECT id, name, unit, requires_allocation AS "requiresAllocation", approval_workflow AS "approvalWorkflow", payroll_impact AS "payrollImpact", COALESCE(payroll_work_entry, \'\') AS "payrollWorkEntry", COALESCE(display_color, \'Blue\') AS "displayColor", active FROM leave_types ORDER BY id',
    ),
    pool.query(
      "SELECT id, name, code, category, sequence, method, COALESCE(base, '') AS base, COALESCE(value::float, 0) AS value, COALESCE(expression, '') AS expression FROM salary_rules ORDER BY sequence",
    ),
    pool.query(
      `SELECT s.id, s.name, s.active, COALESCE(array_remove(array_agg(sr.rule_id ORDER BY r.sequence), NULL), ARRAY[]::text[]) AS "ruleIds" FROM salary_structures s LEFT JOIN salary_structure_rules sr ON s.id = sr.structure_id LEFT JOIN salary_rules r ON sr.rule_id = r.id GROUP BY s.id, s.name, s.active ORDER BY s.id`,
    ),
    pool.query(
      'SELECT id, name, schedule_type AS type, days, work_rows AS "workRows", start_time AS "start", end_time AS "end", break_hours::float AS "breakHours", weekly_hours::float AS "weeklyHours", COALESCE(company, \'My Company\') AS company, COALESCE(timezone, \'Company timezone\') AS timezone, COALESCE(status, \'Active\') AS status FROM schedules ORDER BY id',
    ),
    pool.query(
      `SELECT p.id, p.name, p.period, COALESCE(p.structure_id, '') AS "structureId", p.status, COALESCE(to_char(p.paid_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '') AS "paidAt", COALESCE((SELECT array_agg(employee_id) FROM payrun_employees WHERE payrun_id = p.id), ARRAY[]::text[]) AS "employeeIds" FROM payruns p ORDER BY p.period`,
    ),
    pool.query(
      `SELECT DISTINCT ON (payrun_id, employee_id)
       id, payrun_id AS "payrunId", employee_id AS "employeeId", period,
       COALESCE(structure_id, '') AS "structureId", COALESCE(contract_id, '') AS "contractId",
       basic::float AS basic, gross::float AS gross, deductions::float AS deductions,
       net::float AS net, worked_days AS "workedDays", scheduled_days::float AS "scheduledDays",
       unpaid_leave_days::float AS "unpaidLeaveDays", payable_days::float AS "payableDays",
       CASE WHEN $1::text IS NULL OR period = $1 THEN lines ELSE '[]'::jsonb END AS lines
     FROM payslips
     ORDER BY payrun_id, employee_id, created_at DESC, id DESC`,
      [options.attendancePeriod || null],
    ),
    pool.query(
      'SELECT id, action, to_char(at, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\') AS at, actor FROM audit_logs ORDER BY at DESC LIMIT 100',
    ),
  ]);

  const slipsByPayrun: Record<string, any[]> = {};
  for (const s of payslipsRes.rows) {
    if (!slipsByPayrun[s.payrunId]) slipsByPayrun[s.payrunId] = [];
    slipsByPayrun[s.payrunId].push(s);
  }

  const payruns = payrunsRes.rows.map((p) => ({
    ...p,
    slips: slipsByPayrun[p.id] || [],
  }));

  return {
    employees: employeesRes.rows,
    contracts: contractsRes.rows,
    attendance: attendanceRes.rows,
    requests: requestsRes.rows,
    allocations: allocationsRes.rows,
    leaveTypes: leaveTypesRes.rows,
    rules: rulesRes.rows,
    structures: structuresRes.rows,
    schedules: schedulesRes.rows,
    payruns,
    audit: auditRes.rows,
  };
}

/**
 * Synchronize all entities from Workspace into PostgreSQL relational tables.
 */
async function syncRelational(client: PoolClient, data: Workspace) {
  await ensureSchema(client);
  // 1. Schedules
  if (data.schedules?.length) {
    await client.query(
      `
      INSERT INTO schedules (id, name, schedule_type, days, work_rows, start_time, end_time, break_hours, weekly_hours, company, timezone, status)
      SELECT
        x->>'id',
        x->>'name',
        COALESCE(x->>'type', 'Fixed'),
        COALESCE(x->'days', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb),
        COALESCE(x->'workRows', '[]'::jsonb),
        COALESCE(x->>'start', '09:00'),
        COALESCE(x->>'end', '18:00'),
        COALESCE((x->>'breakHours')::numeric, 1.0),
        COALESCE((x->>'weeklyHours')::numeric, 0),
        COALESCE(x->>'company', 'My Company'),
        COALESCE(x->>'timezone', 'Company timezone'),
        COALESCE(x->>'status', 'Active')
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        schedule_type = EXCLUDED.schedule_type,
        days = EXCLUDED.days,
        work_rows = EXCLUDED.work_rows,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        break_hours = EXCLUDED.break_hours,
        weekly_hours = EXCLUDED.weekly_hours,
        company = EXCLUDED.company,
        timezone = EXCLUDED.timezone,
        status = EXCLUDED.status;
    `,
      [JSON.stringify(data.schedules)],
    );
  }

  // 2. Employees
  if (data.employees?.length) {
    await client.query(
      `
      INSERT INTO employees (id, name, email, phone, department, position, type, status, manager, manager_employee_id, location, schedule_id, bank, personal_email, personal_phone, address, emergency_contact_name, emergency_contact_phone, government_id_type, government_id_number)
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
        NULLIF(x->>'managerEmployeeId', ''),
        COALESCE(x->>'location', 'Mumbai'),
        x->>'scheduleId',
        x->>'bank',
        x->>'personalEmail',
        x->>'personalPhone',
        x->>'address',
        x->>'emergencyContactName',
        x->>'emergencyContactPhone',
        x->>'governmentIdType',
        x->>'governmentIdNumber'
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        department = EXCLUDED.department,
        position = EXCLUDED.position,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        manager = EXCLUDED.manager,
        manager_employee_id = EXCLUDED.manager_employee_id,
        location = EXCLUDED.location,
        schedule_id = EXCLUDED.schedule_id,
        bank = EXCLUDED.bank,
        personal_email = EXCLUDED.personal_email,
        personal_phone = EXCLUDED.personal_phone,
        address = EXCLUDED.address,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        government_id_type = EXCLUDED.government_id_type,
        government_id_number = EXCLUDED.government_id_number;
    `,
      [JSON.stringify(data.employees)],
    );

    // Keep RBAC users synchronized with employees
    await client.query(`
      INSERT INTO users (id, email, name, role_id, employee_id, active)
      SELECT
        'u_' || e.id,
        e.email,
        e.name,
        CASE 
          WHEN e.id = 'e0' THEN 'admin'
          WHEN e.department = 'HR' THEN 'hr_manager'
          WHEN e.department = 'Finance' THEN 'finance_manager'
          ELSE 'employee'
        END,
        e.id,
        true
      FROM employees e
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        employee_id = EXCLUDED.employee_id;

      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, u.role_id
      FROM users u
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `);
  }

  // 3. Salary Structures
  if (data.structures?.length) {
    await client.query(
      `
      INSERT INTO salary_structures (id, name, active)
      SELECT
        x->>'id',
        x->>'name',
        COALESCE((x->>'active')::boolean, true)
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        active = EXCLUDED.active;
    `,
      [JSON.stringify(data.structures)],
    );
  }

  // 4. Salary Rules
  if (data.rules?.length) {
    await client.query(
      `
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
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        category = EXCLUDED.category,
        sequence = EXCLUDED.sequence,
        method = EXCLUDED.method,
        base = EXCLUDED.base,
        value = EXCLUDED.value,
        expression = EXCLUDED.expression;
    `,
      [JSON.stringify(data.rules)],
    );
  }

  // 5. Structure Rules junction
  if (data.structures?.length) {
    await client.query(
      `
      DELETE FROM salary_structure_rules WHERE structure_id IN (SELECT x->>'id' FROM jsonb_array_elements($1::jsonb) x)
    `,
      [JSON.stringify(data.structures)],
    );
    await client.query(
      `
      INSERT INTO salary_structure_rules (structure_id, rule_id)
      SELECT 
        s->>'id',
        r.rule_id
      FROM jsonb_array_elements($1::jsonb) AS s,
      LATERAL jsonb_array_elements_text(s->'ruleIds') AS r(rule_id)
      ON CONFLICT (structure_id, rule_id) DO NOTHING
    `,
      [JSON.stringify(data.structures)],
    );
  }

  // 6. Contracts
  if (data.contracts?.length) {
    await client.query(
      `
      INSERT INTO contracts (id, employee_id, start_date, end_date, wage, structure_id, schedule_id, status)
      SELECT
        x->>'id',
        x->>'employeeId',
        (x->>'start')::date,
        NULLIF(x->>'end', '')::date,
        (x->>'wage')::numeric,
        x->>'structureId',
        x->>'scheduleId',
        COALESCE(x->>'status', 'Running')
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        wage = EXCLUDED.wage,
        structure_id = EXCLUDED.structure_id,
        schedule_id = EXCLUDED.schedule_id,
        status = EXCLUDED.status;
    `,
      [JSON.stringify(data.contracts)],
    );
  }

  // 7. Attendance
  if (data.attendance?.length) {
    await client.query(
      `
      INSERT INTO attendance (id, employee_id, date, check_in, check_out, overtime, edited)
      SELECT
        x->>'id',
        x->>'employeeId',
        (x->>'date')::date,
        NULLIF(x->>'checkIn', ''),
        NULLIF(x->>'checkOut', ''),
        COALESCE((x->>'overtime')::numeric, 0),
        COALESCE((x->>'edited')::boolean, false)
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        overtime = EXCLUDED.overtime,
        edited = EXCLUDED.edited;
    `,
      [JSON.stringify(data.attendance)],
    );
  }

  // 8. Leave Types
  if (data.leaveTypes?.length) {
    await client.query(
      `
      INSERT INTO leave_types (id, name, unit, requires_allocation, approval_workflow, payroll_impact, payroll_work_entry, display_color, active)
      SELECT
        x->>'id',
        x->>'name',
        COALESCE(x->>'unit', 'Days'),
        COALESCE((x->>'requiresAllocation')::boolean, true),
        COALESCE(x->>'approvalWorkflow', 'HR Approval'),
        COALESCE(x->>'payrollImpact', 'Paid'),
        NULLIF(x->>'payrollWorkEntry', ''),
        COALESCE(x->>'displayColor', 'Blue'),
        COALESCE((x->>'active')::boolean, true)
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        unit = EXCLUDED.unit,
        requires_allocation = EXCLUDED.requires_allocation,
        approval_workflow = EXCLUDED.approval_workflow,
        payroll_impact = EXCLUDED.payroll_impact,
        payroll_work_entry = EXCLUDED.payroll_work_entry,
        display_color = EXCLUDED.display_color,
        active = EXCLUDED.active;
    `,
      [JSON.stringify(data.leaveTypes)],
    );
  }

  // 9. Leave Allocations
  if (data.allocations?.length) {
    await client.query(
      `
      INSERT INTO leave_allocations (id, employee_id, type_id, amount, start_date, end_date, status, approver)
      SELECT
        x->>'id',
        x->>'employeeId',
        x->>'typeId',
        (x->>'amount')::numeric,
        (x->>'start')::date,
        (x->>'end')::date,
        COALESCE(x->>'status', 'Approved'),
        NULLIF(x->>'approver', '')
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        type_id = EXCLUDED.type_id,
        amount = EXCLUDED.amount,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        approver = EXCLUDED.approver;
    `,
      [JSON.stringify(data.allocations)],
    );
  }

  // 10. Leave Requests
  if (data.requests?.length) {
    await client.query(
      `
      INSERT INTO leave_requests (id, employee_id, type_id, start_date, end_date, duration, reason, status, approver, allocation_id)
      SELECT
        x->>'id',
        x->>'employeeId',
        x->>'typeId',
        (x->>'start')::date,
        (x->>'end')::date,
        (x->>'duration')::numeric,
        x->>'reason',
        COALESCE(x->>'status', 'Pending'),
        x->>'approver',
        NULLIF(x->>'allocationId', '')
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        type_id = EXCLUDED.type_id,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        duration = EXCLUDED.duration,
        reason = EXCLUDED.reason,
        status = EXCLUDED.status,
        approver = EXCLUDED.approver,
        allocation_id = EXCLUDED.allocation_id;
    `,
      [JSON.stringify(data.requests)],
    );
  }

  // 11. Payruns & Junction & Payslips
  if (data.payruns?.length) {
    await client.query(
      `
      INSERT INTO payruns (id, name, period, structure_id, status, paid_at)
      SELECT
        x->>'id',
        x->>'name',
        x->>'period',
        x->>'structureId',
        COALESCE(x->>'status', 'Draft'),
        NULLIF(x->>'paidAt', '')::timestamptz
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        period = EXCLUDED.period,
        structure_id = EXCLUDED.structure_id,
        status = EXCLUDED.status,
        paid_at = COALESCE(EXCLUDED.paid_at, payruns.paid_at);
    `,
      [JSON.stringify(data.payruns)],
    );

    await client.query(
      `
      DELETE FROM payrun_employees WHERE payrun_id IN (SELECT x->>'id' FROM jsonb_array_elements($1::jsonb) AS x)
    `,
      [JSON.stringify(data.payruns)],
    );

    await client.query(
      `
      INSERT INTO payrun_employees (payrun_id, employee_id, period)
      SELECT
        p->>'id',
        e.employee_id,
        p->>'period'
      FROM jsonb_array_elements($1::jsonb) AS p,
      LATERAL jsonb_array_elements_text(p->'employeeIds') AS e(employee_id)
      ON CONFLICT (payrun_id, employee_id) DO UPDATE SET period = EXCLUDED.period
    `,
      [JSON.stringify(data.payruns)],
    );

    // Upsert payslips
    await client.query(
      `
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
      FROM jsonb_array_elements($1::jsonb) AS p,
      LATERAL jsonb_array_elements(COALESCE(p->'slips', '[]'::jsonb)) AS slip
      ON CONFLICT (id) DO UPDATE SET
        payrun_id = EXCLUDED.payrun_id,
        employee_id = EXCLUDED.employee_id,
        period = EXCLUDED.period,
        structure_id = EXCLUDED.structure_id,
        contract_id = EXCLUDED.contract_id,
        basic = EXCLUDED.basic,
        gross = EXCLUDED.gross,
        deductions = EXCLUDED.deductions,
        net = EXCLUDED.net,
        worked_days = EXCLUDED.worked_days,
        scheduled_days = EXCLUDED.scheduled_days,
        unpaid_leave_days = EXCLUDED.unpaid_leave_days,
        payable_days = EXCLUDED.payable_days,
        lines = EXCLUDED.lines;
    `,
      [JSON.stringify(data.payruns)],
    );
  }

  // 12. Audit logs
  if (data.audit?.length) {
    await client.query(
      `
      INSERT INTO audit_logs (id, action, at, actor)
      SELECT
        x->>'id',
        x->>'action',
        COALESCE((x->>'at')::timestamptz, CURRENT_TIMESTAMP),
        COALESCE(x->>'actor', 'System')
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO NOTHING;
    `,
      [JSON.stringify(data.audit)],
    );
  }

  const slipIds = data.payruns.flatMap((run) =>
    run.slips.map((slip: any) => slip.id),
  );
  await client.query('DELETE FROM payslips WHERE NOT (id = ANY($1::text[]))', [
    slipIds,
  ]);
  await client.query(
    'DELETE FROM payrun_employees WHERE NOT (payrun_id = ANY($1::text[]))',
    [data.payruns.map((run) => run.id)],
  );
  await client.query('DELETE FROM payruns WHERE NOT (id = ANY($1::text[]))', [
    data.payruns.map((run) => run.id),
  ]);
  await client.query(
    'DELETE FROM leave_requests WHERE NOT (id = ANY($1::text[]))',
    [data.requests.map((item) => item.id)],
  );
  await client.query(
    'DELETE FROM leave_allocations WHERE NOT (id = ANY($1::text[]))',
    [data.allocations.map((item) => item.id)],
  );
  await client.query(
    'DELETE FROM attendance WHERE NOT (id = ANY($1::text[]))',
    [data.attendance.map((item) => item.id)],
  );
  await client.query('DELETE FROM contracts WHERE NOT (id = ANY($1::text[]))', [
    data.contracts.map((item) => item.id),
  ]);
  await client.query(
    'DELETE FROM salary_structures WHERE NOT (id = ANY($1::text[]))',
    [data.structures.map((item) => item.id)],
  );
  await client.query(
    'DELETE FROM salary_rules WHERE NOT (id = ANY($1::text[]))',
    [data.rules.map((item) => item.id)],
  );
  await client.query('DELETE FROM employees WHERE NOT (id = ANY($1::text[]))', [
    data.employees.map((item) => item.id),
  ]);
  await client.query(
    'DELETE FROM leave_types WHERE NOT (id = ANY($1::text[]))',
    [data.leaveTypes.map((item) => item.id)],
  );
  await client.query('DELETE FROM schedules WHERE NOT (id = ANY($1::text[]))', [
    data.schedules.map((item) => item.id),
  ]);
}

let memoryWorkspace: Workspace | null = null;
let memoryRevision = 0;

function getMemoryWorkspace(): Workspace {
  if (!memoryWorkspace) {
    memoryWorkspace = seed();
  }
  return memoryWorkspace;
}

export async function readWorkspace(
  options: WorkspaceReadOptions = {},
): Promise<{ data: Workspace; revision: number }> {
  try {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      let workspaceRow = await client.query<{ revision: number }>(
        'SELECT revision FROM workspace WHERE id = $1',
        ['demo'],
      );
      await ensureSchema(client);

      if (!workspaceRow.rows[0]) {
        const employeeCount = await client.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM employees',
        );

        if (Number(employeeCount.rows[0]?.count || 0) === 0) {
          await syncRelational(client, seed());
        }

        const current = await readRelational(pool);
        await client.query(
          'INSERT INTO workspace (id, data, revision) VALUES ($1, $2, 0) ON CONFLICT (id) DO NOTHING',
          ['demo', JSON.stringify(current)],
        );
        workspaceRow = await client.query<{ revision: number }>(
          'SELECT revision FROM workspace WHERE id = $1',
          ['demo'],
        );
      }

      const data = await readRelational(pool, options);
      if (!options.attendancePeriod) memoryWorkspace = data;
      memoryRevision = Number(workspaceRow.rows[0]?.revision || 0);
      return { data, revision: memoryRevision };
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(
      '[DB Notice]: Postgres unavailable, using demo seed fallback:',
      err,
    );
    const data = getMemoryWorkspace();
    return {
      data: options.attendancePeriod
        ? {
            ...data,
            attendance: data.attendance.filter((item) =>
              item.date.startsWith(options.attendancePeriod!),
            ),
          }
        : data,
      revision: memoryRevision,
    };
  }
}

export async function writeWorkspace(data: unknown, revision: number) {
  const workspaceData = data as Workspace;
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);

  try {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE workspace SET data = $1, revision = revision + 1 WHERE id = $2 AND revision = $3 RETURNING revision',
        [serialized, 'demo', revision],
      );

      if ((result.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return { meta: { changes: 0 } };
      }

      await syncRelational(client, workspaceData);
      await client.query('COMMIT');

      memoryWorkspace = workspaceData;
      memoryRevision = revision + 1;
      return { meta: { changes: 1 } };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(
      '[DB Notice]: Postgres unavailable, persisting changes in-memory:',
      err,
    );
    memoryWorkspace = workspaceData;
    memoryRevision = revision + 1;
    return { meta: { changes: 1 } };
  }
}
