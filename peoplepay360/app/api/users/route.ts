import { getPgPool } from '@/db/index';
import { verifyJwt } from '@/lib/jwt';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookie = request.headers.get('cookie');
    if (cookie) {
      const match = cookie.match(/pp360_token=([^;]+)/);
      if (match) token = match[1];
    }
  }
  if (!token) return null;
  return verifyJwt(token);
}

export async function GET(request: Request) {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'Admin') {
      return Response.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const pool = getPgPool();
    const usersRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.role_id AS "roleId", u.employee_id AS "employeeId",
              u.active, COALESCE(r.name, u.role_id) AS "roleName"
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
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
    const user = getAuthUser(request);
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
    };

    const { id, name, email, roleId, employeeId, password, active = true } = body;

    if (!name || !email || !roleId) {
      return Response.json({ error: 'Name, email, and role are required.' }, { status: 400 });
    }

    const pool = getPgPool();

    if (id) {
      if (password && password.trim()) {
        await pool.query(
          `UPDATE users
           SET name = $1, email = $2, role_id = $3, employee_id = $4, active = $5, password = $6
           WHERE id = $7`,
          [name.trim(), email.trim().toLowerCase(), roleId, employeeId || null, active, password, id]
        );
      } else {
        await pool.query(
          `UPDATE users
           SET name = $1, email = $2, role_id = $3, employee_id = $4, active = $5
           WHERE id = $6`,
          [name.trim(), email.trim().toLowerCase(), roleId, employeeId || null, active, id]
        );
      }
    } else {
      const newId = `u_${Date.now()}`;
      const defaultPassword = password && password.trim() ? password.trim() : 'welcome123';
      await pool.query(
        `INSERT INTO users (id, name, email, role_id, employee_id, password, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newId, name.trim(), email.trim().toLowerCase(), roleId, employeeId || null, defaultPassword, active]
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
