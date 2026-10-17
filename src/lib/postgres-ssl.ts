/** Supabase Postgres requires TLS. Its pooler certificate is not in Node's default trust store. */
export function postgresSsl(
  connectionString: string | undefined,
): { rejectUnauthorized: false } | undefined {
  if (!connectionString || !/supabase\.(co|com)/i.test(connectionString)) return undefined;
  return { rejectUnauthorized: false };
}
