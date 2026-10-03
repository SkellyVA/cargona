import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export * from './schema.js';
export * from './state-migration.js';
export * from './postgres-state.js';

export function createDatabaseClient(connectionString: string) {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

export type CargonaDatabase = ReturnType<typeof createDatabaseClient>;
