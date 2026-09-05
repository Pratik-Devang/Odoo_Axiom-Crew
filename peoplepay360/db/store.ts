import { seed } from '@/lib/domain';
import { getPgPool } from './index';

interface WorkspaceRow {
  data: string | object;
  revision: number;
}

export async function readWorkspace() {
  if (process.env.DATABASE_URL) {
    const pool = getPgPool();
    const res = await pool.query<WorkspaceRow>(
      'SELECT data, revision FROM workspace WHERE id = $1',
      ['demo']
    );

    let row = res.rows[0];
    if (!row) {
      const initialData = JSON.stringify(seed());
      await pool.query(
        'INSERT INTO workspace (id, data, revision) VALUES ($1, $2, 0) ON CONFLICT (id) DO NOTHING',
        ['demo', initialData]
      );
      const recheck = await pool.query<WorkspaceRow>(
        'SELECT data, revision FROM workspace WHERE id = $1',
        ['demo']
      );
      row = recheck.rows[0];
    }

    if (!row) throw new Error('Workspace could not be loaded from PostgreSQL.');
    const parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return { data: parsedData, revision: Number(row.revision) };
  }

  // Fallback to Cloudflare D1
  try {
    const { env } = await import('cloudflare:workers');
    const db = env?.DB;
    if (db) {
      let row = await db
        .prepare('SELECT data, revision FROM workspace WHERE id = ?')
        .bind('demo')
        .first<{ data: string; revision: number }>();

      if (!row) {
        await db
          .prepare('INSERT OR IGNORE INTO workspace (id, data, revision) VALUES (?, ?, 0)')
          .bind('demo', JSON.stringify(seed()))
          .run();
        row = await db
          .prepare('SELECT data, revision FROM workspace WHERE id = ?')
          .bind('demo')
          .first<{ data: string; revision: number }>();
      }

      if (!row) throw new Error('Workspace could not be loaded.');
      return { data: JSON.parse(row.data), revision: row.revision };
    }
  } catch {
    // Cloudflare binding not available
  }

  throw new Error(
    'No database configured. Please configure DATABASE_URL in .env.local to connect to PostgreSQL.'
  );
}

export async function writeWorkspace(data: unknown, revision: number) {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);

  if (process.env.DATABASE_URL) {
    const pool = getPgPool();
    const result = await pool.query(
      'UPDATE workspace SET data = $1, revision = revision + 1 WHERE id = $2 AND revision = $3',
      [serialized, 'demo', revision]
    );
    return { meta: { changes: result.rowCount ?? 0 } };
  }

  // Fallback to Cloudflare D1
  const { env } = await import('cloudflare:workers');
  if (!env?.DB) {
    throw new Error('No database configured.');
  }

  return env.DB.prepare(
    'UPDATE workspace SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?'
  )
    .bind(serialized, 'demo', revision)
    .run();
}
