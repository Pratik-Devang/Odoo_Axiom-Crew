import { readWorkspace, writeWorkspace } from '@/db/store';
import { mutate } from '@/lib/actions';
import { getActiveAuthUser } from '@/lib/auth';
import { canMutateWorkspace, visibleWorkspace } from '@/lib/workspace-access';
import { isAllowedOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getActiveAuthUser(request);
    if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const current = await readWorkspace();
    return Response.json({ ...current, data: visibleWorkspace(current.data, user) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[Database Error]:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'The workspace database is unavailable. Please retry.',
      },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: 'Cross-origin changes are not allowed.' }, { status: 403 });
  }

  try {
    const user = await getActiveAuthUser(request);
    if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    if (Number(request.headers.get('content-length') || 0) > 100000) {
      return Response.json({ error: 'Request too large.' }, { status: 413 });
    }

    const body = (await request.json()) as {
      revision: number;
      action: string;
      payload?: Record<string, any>;
    };
    const current = await readWorkspace();

    if (!canMutateWorkspace(user, current.data, body.action, body.payload || {})) {
      return Response.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    if (body.revision !== current.revision) {
      return Response.json(
        { error: 'The workspace changed in another session. Reload and try again.' },
        { status: 409 }
      );
    }

    const next = mutate(current.data, body.action, body.payload || {}, user.name || user.email);
    const result = await writeWorkspace(next, current.revision);

    if (!result.meta.changes) {
      return Response.json(
        { error: 'Another change was saved first. Reload and try again.' },
        { status: 409 }
      );
    }

    return Response.json({ data: visibleWorkspace(next, user), revision: current.revision + 1 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to save changes.' },
      { status: 400 }
    );
  }
}
