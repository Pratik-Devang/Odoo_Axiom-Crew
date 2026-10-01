export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  for (const configuredOrigin of (process.env.ALLOWED_ORIGINS || '').split(
    ',',
  )) {
    const value = configuredOrigin.trim();
    if (value) allowedOrigins.add(value.replace(/\/$/, ''));
  }
  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
