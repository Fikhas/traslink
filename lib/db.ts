import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum dikonfigurasi. Salin .env.example menjadi .env.');
  if (!client) client = postgres(url, { max: process.env.NODE_ENV === 'production' ? 10 : 3, prepare: false });
  if (!database) database = drizzle(client, { schema });
  return database;
}
