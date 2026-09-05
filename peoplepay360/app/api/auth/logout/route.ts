export async function POST(request: Request) {
  return Response.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': `pp360_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
          request.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production'
            ? '; Secure'
            : ''
        }`,
      },
    }
  );
}

