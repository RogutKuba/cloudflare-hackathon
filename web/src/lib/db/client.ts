import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);
export const db = drizzle(sql);

export const takeUnique = <T>(arr: T[]): T | undefined => {
  if (arr.length === 0) {
    return undefined;
  }

  return arr[0];
};

export const takeUniqueOrThrow = <T>(arr: T[]): T => {
  if (arr.length !== 1) {
    throw new Error('Expected exactly one value, got ' + arr.length);
  }

  return arr[0];
};
