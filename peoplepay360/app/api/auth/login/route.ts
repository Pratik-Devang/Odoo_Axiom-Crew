import { getPgPool } from '@/db/index';
import { roleName } from '@/lib/auth';
import { signJwt } from '@/lib/jwt';
import {
  hashPassword,
  passwordNeedsUpgrade,
  verifyPassword,
} from '@/lib/password';

const DEMO_CREDENTIALS: Record<
  string,
  {
    id: string;
    name: string;
    email: string;
    role: string;
    employeeId?: string;
    password: string;
  }
> = {
  'admin@oxp.example': {
    id: 'u_admin',
    name: 'Demo Administrator',
    email: 'admin@oxp.example',
    role: 'Admin',
    password: 'admin123',
  },
  'payroll@oxp.example': {
    id: 'u_payroll',
    name: 'Demo Payroll Manager',
    email: 'payroll@oxp.example',
    role: 'HR Payroll Manager',
    password: 'payroll123',
  },
  'user@oxp.example': {
    id: 'u_user',
    name: 'Demo Payroll User',
    email: 'user@oxp.example',
    role: 'HR Payroll User',
    password: 'user123',
  },
  'hrmanager@oxp.example': {
    id: 'u_hrmanager',
    name: 'Demo HR Manager',
    email: 'hrmanager@oxp.example',
    role: 'HR Manager',
    password: 'hrmanager123',
  },
  'john@oxp.example': {
    id: 'u_employee',
    name: 'John Dsouza',
    email: 'john@oxp.example',
    role: 'Employee',
    employeeId: 'e2',
    password: 'employee123',
  },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try PostgreSQL authentication if available.
    let databaseUnavailable = false;
    try {
      const pool = getPgPool();
      const res = await pool.query(
        `SELECT u.id, u.email, u.name, u.role_id, u.employee_id, u.password, u.active, r.name as role_title
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE LOWER(u.email) = LOWER($1)`,
        [cleanEmail],
      );

      const user = res.rows[0];
      if (user) {
        if (!verifyPassword(password, user.password)) {
          return Response.json(
            { error: 'Invalid work email or password.' },
            { status: 401 },
          );
        }

        if (user.active === false) {
          return Response.json(
            { error: 'Account is deactivated. Contact Administrator.' },
            { status: 403 },
          );
        }

        if (passwordNeedsUpgrade(user.password)) {
          await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
            hashPassword(password),
            user.id,
          ]);
        }

        const normalizedRole = roleName(user.role_id, user.role_title);
        const tokenPayload = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizedRole,
          employeeId: user.employee_id || undefined,
        };

        const token = signJwt(tokenPayload);
        return Response.json(
          { success: true, token, user: tokenPayload },
          {
            headers: {
              'Set-Cookie': `pp360_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${
                request.headers.get('x-forwarded-proto') === 'https' ||
                process.env.NODE_ENV === 'production'
                  ? '; Secure'
                  : ''
              }`,
            },
          },
        );
      }
    } catch (dbErr) {
      databaseUnavailable = true;
      console.warn(
        '[Login Notice]: Postgres unavailable, falling back to demo authentication:',
        dbErr,
      );
    }

    // 2. Demo credentials are a development fallback, not an implicit
    // production backdoor when the configured database is reachable.
    const demoAuthEnabled =
      process.env.ALLOW_DEMO_AUTH === 'true' ||
      (process.env.NODE_ENV !== 'production' && databaseUnavailable);
    const demo = DEMO_CREDENTIALS[cleanEmail];
    if (demoAuthEnabled && demo && demo.password === password) {
      const tokenPayload = {
        id: demo.id,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        employeeId: demo.employeeId,
      };

      const token = signJwt(tokenPayload);
      return Response.json(
        { success: true, token, user: tokenPayload },
        {
          headers: {
            'Set-Cookie': `pp360_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${
              request.headers.get('x-forwarded-proto') === 'https' ||
              process.env.NODE_ENV === 'production'
                ? '; Secure'
                : ''
            }`,
          },
        },
      );
    }

    return Response.json(
      { error: 'Invalid work email or password.' },
      { status: 401 },
    );
  } catch (err) {
    console.error('Login error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Authentication failed.' },
      { status: 500 },
    );
  }
}
