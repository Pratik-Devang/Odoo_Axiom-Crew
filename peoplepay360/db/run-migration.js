import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  process.loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch {
  // DATABASE_URL may already be supplied by the shell.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function applyOnce(client, name, sql) {
  const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
  if (applied.rowCount) {
    console.log(`Skipping ${name} (already applied).`);
    return;
  }

  console.log(`Applying ${name}...`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function run() {
  console.log('Connecting to PostgreSQL...');
  const client = await pool.connect();
  try {
    const setupSql = fs.readFileSync(path.resolve(__dirname, 'setup-postgres.sql'), 'utf8');
    await client.query(setupSql);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const baselineSql = fs.readFileSync(path.resolve(__dirname, 'relational-migration.sql'), 'utf8')
      .replace(/\bBEGIN;\s*/i, '')
      .replace(/\bCOMMIT;\s*$/i, '');
    await applyOnce(client, '000_relational_baseline', baselineSql);

    const migrationsDir = path.resolve(__dirname, 'migrations');
    const migrationFiles = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort()
      : [];

    for (const file of migrationFiles) {
      await applyOnce(client, file, fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
    }

    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM employees) AS employees,
        (SELECT count(*)::int FROM contracts) AS contracts,
        (SELECT count(*)::int FROM payruns) AS payruns,
        (SELECT count(*)::int FROM payslips) AS payslips
    `);
    console.log('Database is current:', counts.rows[0]);
  } finally {
    client.release();
  }
}

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
