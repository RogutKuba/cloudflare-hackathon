import { Context } from 'hono';
import { AppContext } from '.';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
export const getDbClient = (ctx: Context<AppContext>) => {
  const local = ctx.get('db');

  if (local) {
    return local;
  }

  const client = postgres(ctx.env.DATABASE_URL);
  const db = drizzle(client);
  ctx.set('db', db);
  return db;
};

export const getDbClientFromEnv = (env: AppContext['Bindings']) => {
  const client = postgres(env.DATABASE_URL, { prepare: false });
  return drizzle(client);
};
