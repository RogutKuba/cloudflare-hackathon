import { Context } from 'hono';
import { AppConext } from '.';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
export const getDbClient = (ctx: Context<AppConext>) => {
  const local = ctx.get('db');

  if (local) {
    return local;
  }

  const client = postgres(ctx.env.DATABASE_URL);
  const db = drizzle(client);
  ctx.set('db', db);
  return db;
};
