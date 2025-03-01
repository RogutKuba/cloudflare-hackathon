import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  decimal,
} from 'drizzle-orm/pg-core';

export const callScoreTable = pgTable('call_scores', {
  id: serial('id').primaryKey(),
  call_id: text('call_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  epoch: integer('epoch').notNull(),
  politenessScore: decimal('politeness_score', {
    precision: 10,
    scale: 2,
  }).notNull(),
});

export type CallScoreEntity = typeof callScoreTable.$inferSelect;
