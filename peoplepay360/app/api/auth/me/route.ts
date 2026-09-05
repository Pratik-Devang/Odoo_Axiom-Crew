import { verifyJwt } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
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

    if (!token) {
      return Response.json({ user: null }, { status: 200 });
    }

    const payload = verifyJwt(token);
    if (!payload) {
      return Response.json({ user: null }, { status: 200 });
    }

    return Response.json({ user: payload });
  } catch (err) {
    return Response.json({ user: null });
  }
}

