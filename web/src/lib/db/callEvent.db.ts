import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const callEventTable = pgTable('call_events', {
  id: text('id').primaryKey(),
  call_id: text('call_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  epoch: integer('epoch').notNull(),
  timeIntoCall: integer('time_into_call').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
});

export type CallEventEntity = typeof callEventTable.$inferSelect;
