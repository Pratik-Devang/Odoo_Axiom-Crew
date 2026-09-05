import { getPgPool } from '@/db/index';
import { roleName } from '@/lib/auth';
import { signJwt } from '@/lib/jwt';
import { hashPassword, passwordNeedsUpgrade, verifyPassword } from '@/lib/password';

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
    if (!user || !verifyPassword(password, user.password)) {
      return Response.json({ error: 'Invalid work email or password.' }, { status: 401 });
    }

    if (user.active === false) {
      return Response.json({ error: 'Account is deactivated. Contact Administrator.' }, { status: 403 });
    }

    if (passwordNeedsUpgrade(user.password)) {
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashPassword(password), user.id]);
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
      {
        success: true,
        token,
        user: tokenPayload,
      },
      {
        headers: {
          'Set-Cookie': `pp360_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${
            request.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production'
              ? '; Secure'
              : ''
          }`,
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

