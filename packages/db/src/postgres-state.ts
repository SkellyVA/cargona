import postgres from 'postgres';
import { inspectState } from './state-migration.js';

// ponytail: one complete JSONB state and one writer; row-level models require a separate migration.
export async function openPostgresState(url: string) {
  let disconnected = false;
  const sql = postgres(url, { max: 1, idle_timeout: 0, max_lifetime: 0, connect_timeout: 10,
    connection: { statement_timeout: 15000, lock_timeout: 5000 },
    onnotice: () => {}, onclose: () => { disconnected = true; } });
  async function bounded<T>(operation: PromiseLike<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([Promise.resolve(operation), new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          disconnected = true;
          void sql.end({ timeout: 0 }).catch(() => {});
          reject(new Error('PostgreSQL operation timed out; recovery required'));
        }, 30000);
      })]);
    } finally { clearTimeout(timer!); }
  }
  let revision: string;
  try {
    const [lock] = await bounded(sql`SELECT pg_try_advisory_lock(1128354383, 1) AS acquired`);
    if (!lock.acquired) throw new Error('Another PostgreSQL state writer is running');
    const [row] = await bounded(sql`SELECT document, source_sha256, revision::text FROM cargona_legacy_state WHERE id = 1`);
    if (!row || inspectState(row.document).sha256 !== row.source_sha256) throw new Error('Missing or invalid migrated state');
    revision = row.revision;
    return {
      document: row.document as Record<string, any>,
      async save(document: Record<string, unknown>) {
        if (disconnected) throw new Error('PostgreSQL writer connection lost');
        const checksum = inspectState(document).sha256;
        await bounded(sql.begin(async tx => {
          // Reconnection must not bypass the session lease held by another process.
          const [lease] = await tx`SELECT pg_try_advisory_xact_lock(1128354383, 1) AS acquired`;
          if (!lease.acquired) throw new Error('PostgreSQL writer lease lost');
          const rows = await tx`UPDATE cargona_legacy_state SET document = ${tx.json(document as any)},
            source_sha256 = ${checksum}, revision = revision + 1
            WHERE id = 1 AND revision = ${revision} RETURNING revision::text`;
          if (rows.length !== 1) throw new Error('PostgreSQL state revision changed');
          // Assigned after COMMIT below; a failed commit blocks the API until recovery.
        }));
        revision = String(BigInt(revision) + 1n);
      },
      async check() {
        if (disconnected) throw new Error('PostgreSQL writer connection lost');
        const [row] = await bounded(sql`SELECT revision::text FROM cargona_legacy_state WHERE id = 1`);
        if (!row || row.revision !== revision) throw new Error('PostgreSQL state unavailable or changed');
      },
      close: () => sql.end({ timeout: 5 }),
    };
  } catch {
    await sql.end({ timeout: 5 });
    throw new Error('Cannot open PostgreSQL state: check migration, connection and single-writer ownership');
  }
}
