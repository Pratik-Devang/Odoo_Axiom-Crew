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

async function run() {
  console.log('Connecting to PostgreSQL to run relational migration...');
  const setupSql = fs.readFileSync(path.resolve(__dirname, 'setup-postgres.sql'), 'utf8');
  const migrationSql = fs.readFileSync(path.resolve(__dirname, 'relational-migration.sql'), 'utf8');

  try {
    const client = await pool.connect();
    console.log('Connected! Creating the workspace table...');
    await client.query(setupSql);
    console.log('Executing relational-migration.sql...');
    await client.query(migrationSql);
    console.log('Migration successfully executed!');
    
    // Check table counts
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\nTables created in PostgreSQL:');
    res.rows.forEach(r => console.log(' - ' + r.table_name));

    // Check employee count
    const empRes = await client.query('SELECT count(*) FROM employees;');
    console.log(`\nMigrated ${empRes.rows[0].count} employee records into relational table.`);

    const contractRes = await client.query('SELECT count(*) FROM contracts;');
    console.log(`Migrated ${contractRes.rows[0].count} contract records into relational table.`);

    const payrunRes = await client.query('SELECT count(*) FROM payruns;');
    console.log(`Migrated ${payrunRes.rows[0].count} payrun records into relational table.`);

    const slipRes = await client.query('SELECT count(*) FROM payslips;');
    console.log(`Migrated ${slipRes.rows[0].count} payslip records into relational table.`);

    client.release();
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

void run();
