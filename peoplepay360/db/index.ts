import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPgPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Please set DATABASE_URL in .env.local (e.g. postgresql://postgres:password@localhost:5432/peoplepay360).'
      );
    }
    pool = new Pool({
      connectionString,
      max: 25,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export function getDb() {
  const p = getPgPool();
  return drizzle(p, { schema });
}
