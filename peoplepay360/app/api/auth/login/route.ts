import { getPgPool } from '@/db/index';
import { signJwt } from '@/lib/jwt';

const ROLE_NAME_MAP: Record<string, string> = {
  admin: 'Admin',
  payroll_manager: 'HR Payroll Manager',
  finance_manager: 'HR Payroll Manager',
  payroll_user: 'HR Payroll User',
  hr_manager: 'HR Manager',
  employee: 'Employee',
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const pool = getPgPool();
    const res = await pool.query(
      `SELECT u.id, u.email, u.name, u.role_id, u.employee_id, u.password, u.active, r.name as role_title
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email.trim()]
    );

    const user = res.rows[0];
    if (!user || user.password !== password) {
      return Response.json({ error: 'Invalid work email or password.' }, { status: 401 });
    }

    if (user.active === false) {
      return Response.json({ error: 'Account is deactivated. Contact Administrator.' }, { status: 403 });
    }

    const normalizedRole = ROLE_NAME_MAP[user.role_id] || user.role_title || user.role_id;

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizedRole,
      employeeId: user.employee_id || undefined,
    };

    const token = signJwt(tokenPayload);

    return Response.json(
      {
        success: true,
        token,
        user: tokenPayload,
      },
      {
        headers: {
          'Set-Cookie': `pp360_token=${token}; Path=/; SameSite=Lax; Max-Age=86400`,
        },
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Authentication failed.' },
      { status: 500 }
    );
  }
}

