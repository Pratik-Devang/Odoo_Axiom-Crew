import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const { Pool } = pg;

const globalForPostgres = globalThis as typeof globalThis & {
  peoplePayPostgresPool?: pg.Pool;
};

export function getPgPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please set DATABASE_URL in .env.local (e.g. postgresql://postgres:password@localhost:5432/peoplepay360).'
    );
  }

  if (!globalForPostgres.peoplePayPostgresPool) {
    globalForPostgres.peoplePayPostgresPool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      query_timeout: 10000,
      statement_timeout: 10000,
    });
  }

  return globalForPostgres.peoplePayPostgresPool;
}

export function getDb() {
  return drizzle(getPgPool(), { schema });
}
