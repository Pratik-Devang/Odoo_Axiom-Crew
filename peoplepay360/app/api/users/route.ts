import { getPgPool } from '@/db/index';
import { getActiveAuthUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function GET(request: Request) {
  try {
    const user = await getActiveAuthUser(request);
    if (!user || user.role !== 'Admin') {
      return Response.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const pool = getPgPool();
    const usersRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.role_id AS "roleId", u.employee_id AS "employeeId",
              u.active, COALESCE(r.name, u.role_id) AS "roleName",
              e.department, e.position, e.phone, e.type, e.status AS "employeeStatus",
              e.manager, e.location, e.schedule_id AS "scheduleId", e.bank
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN employees e ON e.id = u.employee_id
       ORDER BY u.name`
    );

    const rolesRes = await pool.query('SELECT id, name, description FROM roles ORDER BY name');

    return Response.json({
      users: usersRes.rows,
      roles: rolesRes.rows,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getActiveAuthUser(request);
    if (!user || user.role !== 'Admin') {
      return Response.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
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

    if (!name || !email || !roleId) {
      return Response.json({ error: 'Name, email, and role are required.' }, { status: 400 });
    }
    if ((!id && !password?.trim()) || (password?.trim() && password.trim().length < 8)) {
      return Response.json({ error: 'New passwords must contain at least 8 characters.' }, { status: 400 });
    }

    const pool = getPgPool();

    if (id) {
      const currentRes = await pool.query('SELECT employee_id FROM users WHERE id = $1', [id]);
      let targetEmpId = employeeId || currentRes.rows[0]?.employee_id;

      if (targetEmpId) {
        await pool.query(
          `UPDATE employees
           SET name = $1, email = $2, department = $3, position = $4, phone = $5,
               type = $6, manager = $7, location = $8, schedule_id = $9, bank = $10
           WHERE id = $11`,
          [
            name.trim(),
            email.trim().toLowerCase(),
            department,
            position,
            phone,
            type,
            manager,
            location,
            scheduleId,
            bank,
            targetEmpId,
          ]
        );
      } else {
        targetEmpId = `e_${Date.now()}`;
        await pool.query(
          `INSERT INTO employees (id, name, department, position, email, phone, type, status, manager, location, schedule_id, bank)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, $9, $10, $11)`,
          [
            targetEmpId,
            name.trim(),
            department,
            position,
            email.trim().toLowerCase(),
            phone,
            type,
            manager,
            location,
            scheduleId,
            bank,
          ]
        );
      }

      if (password && password.trim()) {
        await pool.query(
          `UPDATE users
           SET name = $1, email = $2, role_id = $3, employee_id = $4, active = $5, password = $6
           WHERE id = $7`,
          [name.trim(), email.trim().toLowerCase(), roleId, targetEmpId, active, hashPassword(password), id]
        );
      } else {
        await pool.query(
          `UPDATE users
           SET name = $1, email = $2, role_id = $3, employee_id = $4, active = $5
           WHERE id = $6`,
          [name.trim(), email.trim().toLowerCase(), roleId, targetEmpId, id]
        );
      }
    } else {
      const newUserId = `u_${Date.now()}`;
      const newEmpId = `e_${Date.now()}`;
      const initialPassword = hashPassword(password!.trim());

      await pool.query(
        `INSERT INTO employees (id, name, department, position, email, phone, type, status, manager, location, schedule_id, bank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, $9, $10, $11)`,
        [
          newEmpId,
          name.trim(),
          department,
          position,
          email.trim().toLowerCase(),
          phone,
          type,
          manager,
          location,
          scheduleId,
          bank,
        ]
      );

      await pool.query(
        `INSERT INTO users (id, name, email, role_id, employee_id, password, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newUserId, name.trim(), email.trim().toLowerCase(), roleId, newEmpId, initialPassword, active]
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to save user' },
      { status: 500 }
    );
  }
}
