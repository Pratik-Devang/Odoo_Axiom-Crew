export async function POST() {
  return Response.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': 'pp360_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      },
    }
  );
}

