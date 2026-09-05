import { pgTable, text, integer } from 'drizzle-orm/pg-core';

export const workspace = pgTable('workspace', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(0),
});

export type WorkspaceRecord = typeof workspace.$inferSelect;
export type NewWorkspaceRecord = typeof workspace.$inferInsert;
