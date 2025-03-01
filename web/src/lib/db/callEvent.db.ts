import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const callEventTable = pgTable('call_events', {
  id: serial('id').primaryKey(),
  call_id: text('call_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  epoch: integer('epoch').notNull(),
  event_type: text('event_type').notNull(),
  description: text('description').notNull(),
});

export type CallEventEntity = typeof callEventTable.$inferSelect;
