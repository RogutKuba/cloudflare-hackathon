import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/*

{
    "role": "assistant",
    "message": "Hello.",
    "timestamp": "2025-03-01T20:22:14.570983+00:00"
  },
*/

export const callTable = pgTable('calls', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { mode: 'string' }).notNull(),
  endedAt: timestamp('ended_at', { mode: 'string' }),
  duration: integer('duration').notNull(),
  recordingUrl: text('recording_url').notNull(),
  persona: text('persona').notNull(),
  target: text('target').notNull(),
  transcript: jsonb('transcript')
    .$type<
      {
        role: string;
        message: string;
        timestamp: string;
      }[]
    >()
    .notNull(),
  website: text('website').notNull(),
  phoneNumber: text('phone_number').notNull(),
});

export type CallEntity = typeof callTable.$inferSelect;
