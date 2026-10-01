import { getActiveAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const payload = await getActiveAuthUser(request);
    if (!payload) {
      return Response.json({ user: null }, { status: 200 });
    }

    return Response.json({ user: payload });
  } catch {
    return Response.json({ user: null });
  }
}
