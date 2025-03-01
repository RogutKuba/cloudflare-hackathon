import { Context } from 'hono';
import { AppContext } from '.';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { DataAPIClient, VectorDoc, UUID, Db } from '@datastax/astra-db-ts';

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

export const getAstraDbClient = (env: AppContext['Bindings']) => {
  // Initialize the client and get a "Db" object
  const client = new DataAPIClient(env.ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(env.ASTRA_DB_API_ENDPOINT);

  return db;
};
