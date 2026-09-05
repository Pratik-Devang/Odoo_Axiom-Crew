import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const { Pool } = pg;

const globalForPostgres = globalThis as typeof globalThis & {
  peoplePayPostgresPool?: pg.Pool;
};

export function getPgPool(): pg.Pool {
  if (!globalForPostgres.peoplePayPostgresPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Please set DATABASE_URL in .env.local (e.g. postgresql://postgres:password@localhost:5432/peoplepay360).'
      );
    }
    globalForPostgres.peoplePayPostgresPool = new Pool({
      connectionString,
      // Keep one pool across Vinext hot reloads. Creating a new 25-connection
      // pool for every module reload quickly exhausts a local PostgreSQL server.
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }
  return globalForPostgres.peoplePayPostgresPool;
}

export function getDb() {
  const p = getPgPool();
  return drizzle(p, { schema });
}
