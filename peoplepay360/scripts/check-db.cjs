const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    database: 'peoplepay360',
  });

  await client.connect();
  console.log('Connected successfully to peoplepay360!');

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log('Tables in public schema:', tables.rows.map((r) => r.table_name));

  // Check if workspace exists
  const hasWorkspace = tables.rows.some((r) => r.table_name === 'workspace');
  if (!hasWorkspace) {
    console.log('Creating workspace table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace (
        id VARCHAR(255) PRIMARY KEY,
        data TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('workspace table created successfully!');
  } else {
    console.log('workspace table already exists!');
  }

  // Count rows in workspace
  const rows = await client.query('SELECT count(*) FROM workspace');
  console.log('Total rows in workspace table:', rows.rows[0].count);

  await client.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
