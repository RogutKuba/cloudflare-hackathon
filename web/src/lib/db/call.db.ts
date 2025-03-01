import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const callTable = pgTable('calls', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  recordingUrl: text('recording_url').notNull(),
});

export type CallEntity = typeof callTable.$inferSelect;
