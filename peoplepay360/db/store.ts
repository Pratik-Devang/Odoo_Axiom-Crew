import { seed, type Workspace } from '@/lib/domain';
import { getPgPool } from './index';
import type { PoolClient, Pool } from 'pg';

/**
 * Read the entire workspace from normalized PostgreSQL relational tables.
 */
async function readRelational(client: PoolClient): Promise<Workspace> {
  const employeesRes = await client.query(
    'SELECT id, name, email, COALESCE(phone, \'\') AS phone, department, position, type, status, COALESCE(manager, \'\') AS manager, COALESCE(location, \'Mumbai\') AS location, COALESCE(schedule_id, \'sch1\') AS "scheduleId", COALESCE(bank, \'\') AS bank FROM employees ORDER BY id'
  );
  const contractsRes = await client.query(
    `SELECT id, employee_id AS "employeeId", to_char(start_date, 'YYYY-MM-DD') AS "start", COALESCE(to_char(end_date, 'YYYY-MM-DD'), '') AS "end", wage::float AS wage, COALESCE(structure_id, '') AS "structureId", COALESCE(schedule_id, '') AS "scheduleId", status FROM contracts ORDER BY id`
  );
  const attendanceRes = await client.query(
    `SELECT id, employee_id AS "employeeId", to_char(date, 'YYYY-MM-DD') AS "date", COALESCE(check_in, '') AS "checkIn", COALESCE(check_out, '') AS "checkOut", edited FROM attendance ORDER BY date, employee_id`
  );
  const requestsRes = await client.query(
    `SELECT id, employee_id AS "employeeId", type_id AS "typeId", to_char(start_date, 'YYYY-MM-DD') AS "start", to_char(end_date, 'YYYY-MM-DD') AS "end", duration::float AS duration, COALESCE(reason, '') AS reason, status, COALESCE(approver, '') AS approver FROM leave_requests ORDER BY id`
  );
  const allocationsRes = await client.query(
    `SELECT id, employee_id AS "employeeId", type_id AS "typeId", amount::float AS amount, to_char(start_date, 'YYYY-MM-DD') AS "start", to_char(end_date, 'YYYY-MM-DD') AS "end", status FROM leave_allocations ORDER BY id`
  );
  const leaveTypesRes = await client.query(
    'SELECT id, name, unit, requires_allocation AS "requiresAllocation" FROM leave_types ORDER BY id'
  );
  const rulesRes = await client.query(
    "SELECT id, name, code, category, sequence, method, COALESCE(base, '') AS base, COALESCE(value::float, 0) AS value, COALESCE(expression, '') AS expression FROM salary_rules ORDER BY sequence"
  );
  const structuresRes = await client.query(
    `SELECT s.id, s.name, s.active, COALESCE(array_remove(array_agg(sr.rule_id ORDER BY r.sequence), NULL), ARRAY[]::varchar[]) AS "ruleIds" FROM salary_structures s LEFT JOIN salary_structure_rules sr ON s.id = sr.structure_id LEFT JOIN salary_rules r ON sr.rule_id = r.id GROUP BY s.id, s.name, s.active ORDER BY s.id`
  );
  const schedulesRes = await client.query(
    'SELECT id, name, days, start_time AS "start", end_time AS "end", break_hours::float AS "breakHours" FROM schedules ORDER BY id'
  );
  const payrunsRes = await client.query(
    `SELECT p.id, p.name, p.period, COALESCE(p.structure_id, '') AS "structureId", p.status, COALESCE((SELECT array_agg(employee_id) FROM payrun_employees WHERE payrun_id = p.id), ARRAY[]::varchar[]) AS "employeeIds" FROM payruns p ORDER BY p.period`
  );
  const payslipsRes = await client.query(
    'SELECT id, payrun_id AS "payrunId", employee_id AS "employeeId", period, COALESCE(structure_id, \'\') AS "structureId", COALESCE(contract_id, \'\') AS "contractId", basic::float AS basic, gross::float AS gross, deductions::float AS deductions, net::float AS net, worked_days AS "workedDays", lines FROM payslips ORDER BY id'
  );
  const auditRes = await client.query(
    'SELECT id, action, to_char(at, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\') AS at, actor FROM audit_logs ORDER BY at DESC LIMIT 100'
  );

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
  // 1. Schedules
  if (data.schedules?.length) {
    await client.query(
      `
      INSERT INTO schedules (id, name, days, start_time, end_time, break_hours)
      SELECT
        x->>'id',
        x->>'name',
        COALESCE(x->'days', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb),
        COALESCE(x->>'start', '09:00'),
        COALESCE(x->>'end', '18:00'),
        COALESCE((x->>'breakHours')::numeric, 1.0)
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        days = EXCLUDED.days,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        break_hours = EXCLUDED.break_hours;
    `,
      [JSON.stringify(data.schedules)]
    );
  }

  // 2. Employees
  if (data.employees?.length) {
    await client.query(
      `
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
        location = EXCLUDED.location,
        schedule_id = EXCLUDED.schedule_id,
        bank = EXCLUDED.bank;
    `,
      [JSON.stringify(data.employees)]
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
      [JSON.stringify(data.structures)]
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
      [JSON.stringify(data.rules)]
    );
  }

  // 5. Structure Rules junction
  if (data.structures?.length) {
    await client.query(
      `
      DELETE FROM salary_structure_rules WHERE structure_id IN (SELECT x->>'id' FROM jsonb_array_elements($1::jsonb) x)
    `,
      [JSON.stringify(data.structures)]
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
      [JSON.stringify(data.structures)]
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
      [JSON.stringify(data.contracts)]
    );
  }

  // 7. Attendance
  if (data.attendance?.length) {
    await client.query(
      `
      INSERT INTO attendance (id, employee_id, date, check_in, check_out, edited)
      SELECT
        x->>'id',
        x->>'employeeId',
        (x->>'date')::date,
        NULLIF(x->>'checkIn', ''),
        NULLIF(x->>'checkOut', ''),
        COALESCE((x->>'edited')::boolean, false)
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        edited = EXCLUDED.edited;
    `,
      [JSON.stringify(data.attendance)]
    );
  }

  // 8. Leave Types
  if (data.leaveTypes?.length) {
    await client.query(
      `
      INSERT INTO leave_types (id, name, unit, requires_allocation)
      SELECT
        x->>'id',
        x->>'name',
        COALESCE(x->>'unit', 'Days'),
        COALESCE((x->>'requiresAllocation')::boolean, true)
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        unit = EXCLUDED.unit,
        requires_allocation = EXCLUDED.requires_allocation;
    `,
      [JSON.stringify(data.leaveTypes)]
    );
  }

  // 9. Leave Allocations
  if (data.allocations?.length) {
    await client.query(
      `
      INSERT INTO leave_allocations (id, employee_id, type_id, amount, start_date, end_date, status)
      SELECT
        x->>'id',
        x->>'employeeId',
        x->>'typeId',
        (x->>'amount')::numeric,
        (x->>'start')::date,
        (x->>'end')::date,
        COALESCE(x->>'status', 'Approved')
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        type_id = EXCLUDED.type_id,
        amount = EXCLUDED.amount,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status;
    `,
      [JSON.stringify(data.allocations)]
    );
  }

  // 10. Leave Requests
  if (data.requests?.length) {
    await client.query(
      `
      INSERT INTO leave_requests (id, employee_id, type_id, start_date, end_date, duration, reason, status, approver)
      SELECT
        x->>'id',
        x->>'employeeId',
        x->>'typeId',
        (x->>'start')::date,
        (x->>'end')::date,
        (x->>'duration')::numeric,
        x->>'reason',
        COALESCE(x->>'status', 'Pending'),
        x->>'approver'
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        type_id = EXCLUDED.type_id,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        duration = EXCLUDED.duration,
        reason = EXCLUDED.reason,
        status = EXCLUDED.status,
        approver = EXCLUDED.approver;
    `,
      [JSON.stringify(data.requests)]
    );
  }

  // 11. Payruns & Junction & Payslips
  if (data.payruns?.length) {
    await client.query(
      `
      INSERT INTO payruns (id, name, period, structure_id, status)
      SELECT
        x->>'id',
        x->>'name',
        x->>'period',
        x->>'structureId',
        COALESCE(x->>'status', 'Draft')
      FROM jsonb_array_elements($1::jsonb) AS x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        period = EXCLUDED.period,
        structure_id = EXCLUDED.structure_id,
        status = EXCLUDED.status;
    `,
      [JSON.stringify(data.payruns)]
    );

    await client.query(
      `
      DELETE FROM payrun_employees WHERE payrun_id IN (SELECT x->>'id' FROM jsonb_array_elements($1::jsonb) AS x)
    `,
      [JSON.stringify(data.payruns)]
    );

    await client.query(
      `
      INSERT INTO payrun_employees (payrun_id, employee_id)
      SELECT
        p->>'id',
        e.employee_id
      FROM jsonb_array_elements($1::jsonb) AS p,
      LATERAL jsonb_array_elements_text(p->'employeeIds') AS e(employee_id)
      ON CONFLICT (payrun_id, employee_id) DO NOTHING
    `,
      [JSON.stringify(data.payruns)]
    );

    // Upsert payslips
    await client.query(
      `
      INSERT INTO payslips (id, payrun_id, employee_id, period, structure_id, contract_id, basic, gross, deductions, net, worked_days, lines)
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
        lines = EXCLUDED.lines;
    `,
      [JSON.stringify(data.payruns)]
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
      [JSON.stringify(data.audit)]
    );
  }
}

export async function readWorkspace(): Promise<{ data: Workspace; revision: number }> {
  if (process.env.DATABASE_URL) {
    const pool = getPgPool();
    const res = await pool.query<{ data: string | object; revision: number }>(
      'SELECT data, revision FROM workspace WHERE id = $1',
      ['demo']
    );

    let row = res.rows[0];
    if (!row || !row.data || row.data === '{}') {
      const initial = seed();
      await pool.query(
        'INSERT INTO workspace (id, data, revision) VALUES ($1, $2, 0) ON CONFLICT (id) DO UPDATE SET data = $2, revision = 0',
        ['demo', JSON.stringify(initial)]
      );
      const client = await pool.connect();
      try {
        await syncRelational(client, initial);
      } finally {
        client.release();
      }
      return { data: initial, revision: 0 };
    }

    const parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return { data: parsedData as Workspace, revision: Number(row.revision) };
  }

  // Fallback to Cloudflare D1
  try {
    const { env } = await import('cloudflare:workers');
    const db = env?.DB;
    if (db) {
      let row = await db
        .prepare('SELECT data, revision FROM workspace WHERE id = ?')
        .bind('demo')
        .first<{ data: string; revision: number }>();

      if (!row) {
        await db
          .prepare('INSERT OR IGNORE INTO workspace (id, data, revision) VALUES (?, ?, 0)')
          .bind('demo', JSON.stringify(seed()))
          .run();
        row = await db
          .prepare('SELECT data, revision FROM workspace WHERE id = ?')
          .bind('demo')
          .first<{ data: string; revision: number }>();
      }

      if (!row) throw new Error('Workspace could not be loaded.');
      return { data: JSON.parse(row.data), revision: row.revision };
    }
  } catch {
    // Cloudflare binding not available
  }

  throw new Error(
    'No database configured. Please configure DATABASE_URL in .env.local to connect to PostgreSQL.'
  );
}

export async function writeWorkspace(data: unknown, revision: number) {
  const workspaceData = data as Workspace;
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);

  if (process.env.DATABASE_URL) {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Optimistic concurrency update
      const result = await client.query(
        'UPDATE workspace SET data = $1, revision = revision + 1 WHERE id = $2 AND revision = $3 RETURNING revision',
        [serialized, 'demo', revision]
      );

      if ((result.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return { meta: { changes: 0 } };
      }

      // Sync changes to normalized PostgreSQL relational tables
      await syncRelational(client, workspaceData);

      await client.query('COMMIT');
      return { meta: { changes: 1 } };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Fallback to Cloudflare D1
  const { env } = await import('cloudflare:workers');
  if (!env?.DB) {
    throw new Error('No database configured.');
  }

  return env.DB.prepare(
    'UPDATE workspace SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?'
  )
    .bind(serialized, 'demo', revision)
    .run();
}
