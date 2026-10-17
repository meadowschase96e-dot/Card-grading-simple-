/** Keep in sync with src/lib/postgres-ssl.ts. Used by the deploy migrator. */
export function postgresSsl(connectionString) {
  if (!connectionString || !/supabase\.(co|com)/i.test(connectionString)) return undefined;
  return { rejectUnauthorized: false };
}
