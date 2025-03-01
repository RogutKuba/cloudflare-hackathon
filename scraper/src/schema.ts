import { pgTable, text, timestamp, varchar, json } from 'drizzle-orm/pg-core';

export const pagesTable = pgTable('pages', {
  id: text('id').primaryKey(),
  callId: text('call_id').notNull(),
  url: text('url').notNull(),
  parentUrl: text('parent_url'),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  title: text('title'),
  content: text('content'),
  metadata: json('metadata'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PageEntity = typeof pagesTable.$inferSelect;
