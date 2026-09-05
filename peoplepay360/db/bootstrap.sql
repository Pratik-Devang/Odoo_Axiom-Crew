-- Local-only bootstrap. Production schema is defined in schema.ts and generated with Drizzle.
CREATE TABLE IF NOT EXISTS workspace (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);
