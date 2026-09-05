export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (request.headers.get('sec-fetch-site') === 'same-origin') return true;

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || requestUrl.protocol.replace(':', '');
  if (host) allowedOrigins.add(`${protocol}://${host}`);
  for (const configuredOrigin of (process.env.ALLOWED_ORIGINS || '').split(',')) {
    const value = configuredOrigin.trim();
    if (value) allowedOrigins.add(value.replace(/\/$/, ''));
  }
  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
