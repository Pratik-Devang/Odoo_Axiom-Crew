import { getPgPool } from '@/db/index';
import { verifyJwt, type JwtPayload } from './jwt';

const ROLE_NAME_MAP: Record<string, string> = {
  admin: 'Admin',
  payroll_manager: 'HR Payroll Manager',
  finance_manager: 'HR Payroll Manager',
  payroll_user: 'HR Payroll User',
  hr_manager: 'HR Manager',
  employee: 'Employee',
};

export function roleName(roleId: string, title?: string | null) {
  return ROLE_NAME_MAP[roleId] || title || roleId;
}

export function getAuthUser(request: Request): JwtPayload | null {
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';
  const cookieToken = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('pp360_token='))
    ?.slice('pp360_token='.length);

  const token = bearer || cookieToken || '';
  return token ? verifyJwt(token) : null;
}

export async function getActiveAuthUser(
  request: Request,
): Promise<JwtPayload | null> {
  const tokenUser = getAuthUser(request);
  if (!tokenUser) return null;

  try {
    const result = await getPgPool().query(
      `SELECT u.id, u.name, u.email, u.employee_id, u.role_id, r.name AS role_title
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.active = true`,
      [tokenUser.id],
    );
    const user = result.rows[0];
    // Do not let a previously issued token resurrect a deleted/deactivated user.
    // The catch below remains the explicit local-demo path when PostgreSQL is down.
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleName(user.role_id, user.role_title),
      employeeId: user.employee_id || undefined,
      iat: tokenUser.iat,
      exp: tokenUser.exp,
    };
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Auth Error]: Unable to verify the active account in PostgreSQL:',
        err,
      );
      return null;
    }
    console.warn(
      '[Auth Notice]: Postgres connection unavailable, using verified JWT token payload in development:',
      err,
    );
    return tokenUser;
  }
}
