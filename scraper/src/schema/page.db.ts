import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const pagesTable = pgTable('pages', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  callId: text('call_id').notNull(),
  url: text('url').notNull(),
  status: text('status').notNull().default('queued'),
  title: text('title'),
  content: text('content'),
});

export type PageEntity = typeof pagesTable.$inferSelect;
