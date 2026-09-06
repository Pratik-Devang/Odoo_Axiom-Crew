import { getPgPool } from '@/db/index';
import { getActiveAuthUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { isAllowedOrigin } from '@/lib/request-origin';

const DEFAULT_DEMO_USERS = [
  {
    id: 'u_admin',
    name: 'Demo Administrator',
    email: 'admin@oxp.example',
    roleId: 'admin',
    roleName: 'Admin',
    active: true,
    department: 'Management',
    position: 'Administrator',
    phone: '+91 90000 10000',
    type: 'Full-time',
    employeeStatus: 'Active',
    manager: 'Board',
    location: 'Mumbai',
    scheduleId: 'sch1',
    bank: 'DEMO-1000',
  },
  {
    id: 'u_payroll',
    name: 'Demo Payroll Manager',
    email: 'payroll@oxp.example',
    roleId: 'payroll_manager',
    roleName: 'HR Payroll Manager',
    active: true,
    department: 'HR',
    position: 'Payroll Manager',
    phone: '+91 90000 10001',
    type: 'Full-time',
    employeeStatus: 'Active',
    manager: 'Demo Administrator',
    location: 'Mumbai',
    scheduleId: 'sch1',
    bank: 'DEMO-1001',
  },
  {
    id: 'u_user',
    name: 'Demo Payroll User',
    email: 'user@oxp.example',
    roleId: 'payroll_user',
    roleName: 'HR Payroll User',
    active: true,
    department: 'HR',
    position: 'Payroll Analyst',
    phone: '+91 90000 10002',
    type: 'Full-time',
    employeeStatus: 'Active',
    manager: 'Demo Payroll Manager',
    location: 'Mumbai',
    scheduleId: 'sch1',
    bank: 'DEMO-1002',
  },
  {
    id: 'u_hrmanager',
    name: 'Demo HR Manager',
    email: 'hrmanager@oxp.example',
    roleId: 'hr_manager',
    roleName: 'HR Manager',
    active: true,
    department: 'HR',
    position: 'HR Manager',
    phone: '+91 90000 10003',
    type: 'Full-time',
    employeeStatus: 'Active',
    manager: 'Demo Administrator',
    location: 'Mumbai',
    scheduleId: 'sch1',
    bank: 'DEMO-1003',
  },
  {
    id: 'u_employee',
    name: 'John Dsouza',
    email: 'john@oxp.example',
    roleId: 'employee',
    roleName: 'Employee',
    employeeId: 'e2',
    active: true,
    department: 'Engineering',
    position: 'Frontend Developer',
    phone: '+91 90000 10004',
    type: 'Full-time',
    employeeStatus: 'Active',
    manager: 'Sara Khan',
    location: 'Mumbai',
    scheduleId: 'sch1',
    bank: 'DEMO-1004',
  },
];

const DEFAULT_DEMO_ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full workspace & user management',
  },
  {
    id: 'payroll_manager',
    name: 'HR Payroll Manager',
    description: 'Author rules, payrun wizard, validate & mark paid',
  },
  {
    id: 'payroll_user',
    name: 'HR Payroll User',
    description: 'Review payruns, compute payslip calculations',
  },
  {
    id: 'hr_manager',
    name: 'HR Manager',
    description: 'Employee profiles, contracts & leave approvals',
  },
  {
    id: 'employee',
    name: 'Employee',
    description: 'Self-service attendance, requests & payslips',
  },
];

export async function GET(request: Request) {
  try {
    const user = await getActiveAuthUser(request);
    if (!user || user.role !== 'Admin') {
      return Response.json(
        { error: 'Unauthorized: Admin access required.' },
        { status: 403 },
      );
    }

    try {
      const pool = getPgPool();
      const usersRes = await pool.query(
        `SELECT u.id, u.name, u.email, u.role_id AS "roleId", u.employee_id AS "employeeId",
                u.active, COALESCE(r.name, u.role_id) AS "roleName",
                e.department, e.position, e.phone, e.type, e.status AS "employeeStatus",
                e.manager, e.location, e.schedule_id AS "scheduleId", e.bank
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         LEFT JOIN employees e ON e.id = u.employee_id
         ORDER BY u.name`,
      );

      const rolesRes = await pool.query(
        'SELECT id, name, description FROM roles ORDER BY name',
      );

      return Response.json({
        users: usersRes.rows,
        roles: rolesRes.rows,
      });
    } catch (dbErr) {
      console.warn(
        '[Users Notice]: Postgres unavailable, returning demo users list:',
        dbErr,
      );
      return Response.json({
        users: DEFAULT_DEMO_USERS,
        roles: DEFAULT_DEMO_ROLES,
      });
    }
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json(
      { error: 'Cross-origin changes are not allowed.' },
      { status: 403 },
    );
  }

  try {
    if (Number(request.headers.get('content-length') || 0) > 100_000) {
      return Response.json({ error: 'Request too large.' }, { status: 413 });
    }

    const user = await getActiveAuthUser(request);
    if (!user || user.role !== 'Admin') {
      return Response.json(
        { error: 'Unauthorized: Admin access required.' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      id?: string;
      name: string;
      email: string;
      roleId: string;
      employeeId?: string;
      password?: string;
      active?: boolean;
      department?: string;
      position?: string;
      phone?: string;
      type?: string;
      manager?: string;
      location?: string;
      scheduleId?: string;
      bank?: string;
    };

    const {
      id,
      name,
      email,
      roleId,
      employeeId,
      password,
      active = true,
      department = 'Engineering',
      position = 'Team Member',
      phone = '+91 90000 10000',
      type = 'Full-time',
      manager = 'Sara Khan',
      location = 'Mumbai',
      scheduleId = 'sch1',
      bank = '',
    } = body;

    const normalizedEmail = email?.trim().toLowerCase();
    if (!name?.trim() || !normalizedEmail || !roleId) {
      return Response.json(
        { error: 'Name, email, and role are required.' },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return Response.json(
        { error: 'Enter a valid work email.' },
        { status: 400 },
      );
    }
    if (
      (!id && !password?.trim()) ||
      (password?.trim() && password.trim().length < 8)
    ) {
      return Response.json(
        { error: 'New passwords must contain at least 8 characters.' },
        { status: 400 },
      );
    }

    const client = await getPgPool().connect();
    try {
      await client.query('BEGIN');
      const roleResult = await client.query(
        'SELECT 1 FROM roles WHERE id = $1',
        [roleId],
      );
      if (!roleResult.rowCount) throw new Error('Select a valid role.');

      if (id) {
        const currentRes = await client.query(
          'SELECT employee_id FROM users WHERE id = $1',
          [id],
        );
        if (!currentRes.rowCount) throw new Error('User not found.');
        let targetEmpId = employeeId || currentRes.rows[0]?.employee_id;

        if (targetEmpId) {
          await client.query(
            `UPDATE employees
           SET name = $1, email = $2, department = $3, position = $4, phone = $5,
               type = $6, manager = $7, location = $8, schedule_id = $9, bank = $10
           WHERE id = $11`,
            [
              name.trim(),
              normalizedEmail,
              department,
              position,
              phone,
              type,
              manager,
              location,
              scheduleId,
              bank,
              targetEmpId,
            ],
          );
        } else {
          targetEmpId = `e_${crypto.randomUUID()}`;
          await client.query(
            `INSERT INTO employees (id, name, department, position, email, phone, type, status, manager, location, schedule_id, bank)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, $9, $10, $11)`,
            [
              targetEmpId,
              name.trim(),
              department,
              position,
              normalizedEmail,
              phone,
              type,
              manager,
              location,
              scheduleId,
              bank,
            ],
          );
        }

        if (password && password.trim()) {
          await client.query(
            `UPDATE users
           SET name = $1, email = $2, role_id = $3, employee_id = $4, active = $5, password = $6
           WHERE id = $7`,
            [
              name.trim(),
              normalizedEmail,
              roleId,
              targetEmpId,
              active,
              hashPassword(password),
              id,
            ],
          );
        } else {
          await client.query(
            `UPDATE users
           SET name = $1, email = $2, role_id = $3, employee_id = $4, active = $5
           WHERE id = $6`,
            [name.trim(), normalizedEmail, roleId, targetEmpId, active, id],
          );
        }
      } else {
        const newUserId = `u_${crypto.randomUUID()}`;
        const newEmpId = `e_${crypto.randomUUID()}`;
        const initialPassword = hashPassword(password!.trim());

        await client.query(
          `INSERT INTO employees (id, name, department, position, email, phone, type, status, manager, location, schedule_id, bank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, $9, $10, $11)`,
          [
            newEmpId,
            name.trim(),
            department,
            position,
            normalizedEmail,
            phone,
            type,
            manager,
            location,
            scheduleId,
            bank,
          ],
        );

        await client.query(
          `INSERT INTO users (id, name, email, role_id, employee_id, password, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newUserId,
            name.trim(),
            normalizedEmail,
            roleId,
            newEmpId,
            initialPassword,
            active,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to save user' },
      { status: 500 },
    );
  }
}
