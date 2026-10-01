import { getPgPool } from '@/db/index';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const { email } = body;

    if (!email?.trim()) {
      return Response.json(
        { error: 'Work email is required.' },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const pool = getPgPool();
      const res = await pool.query(
        'SELECT id, name FROM users WHERE LOWER(email) = LOWER($1)',
        [cleanEmail],
      );

      if (res.rows.length > 0) {
        // Record audit log entry or password reset request
        await pool.query(
          `INSERT INTO audit_logs (id, action, actor)
           VALUES ($1, $2, $3)`,
          [`log_${Date.now()}`, `PASSWORD_RESET_REQUEST: ${cleanEmail}`, res.rows[0].id],
        ).catch(() => null);
      }
    } catch (dbErr) {
      console.warn('[Forgot Password Notice]: Postgres unavailable:', dbErr);
    }

    // Always return a generic success message for security reasons
    return Response.json({
      success: true,
      message: 'If an account exists with that email, password reset instructions have been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Request failed.' },
      { status: 500 },
    );
  }
}
