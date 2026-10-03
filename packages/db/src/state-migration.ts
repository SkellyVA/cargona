import { createHash } from 'node:crypto';
import postgres from 'postgres';

// ponytail: preserve the complete legacy document; normalized tables follow the runtime migration.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function inspectState(state: unknown) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('State must be a JSON object');
  const document = state as Record<string, unknown>;
  const counts: Record<string, number> = {};
  for (const required of ['tenants', 'customers', 'packages', 'users']) {
    if (!Array.isArray(document[required])) throw new Error(`Missing collection: ${required}`);
  }
  for (const [name, records] of Object.entries(document)) {
    if (!Array.isArray(records)) continue;
    counts[name] = records.length;
    const ids = new Set<string>();
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`Invalid record in ${name}`);
      if (record.id == null) continue; // Legacy receipts can use a composite key instead.
      if (typeof record.id !== 'string' && typeof record.id !== 'number') throw new Error(`Invalid ID in ${name}`);
      const id = String(record.id);
      if (!id || ids.has(id)) throw new Error(`Empty or duplicate ID in ${name}`);
      ids.add(id);
    }
  }
  return { sha256: createHash('sha256').update(canonical(document)).digest('hex'), counts };
}

export async function transferState(sql: ReturnType<typeof postgres>, state: unknown, commit = false) {
  const expected = inspectState(state);
  let verified = false;
  const rollback = new Error('CARGONA_TRIAL_ROLLBACK');
  try {
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(1128354383, 1)`;
      await tx`CREATE TABLE IF NOT EXISTS cargona_legacy_state (
        id smallint PRIMARY KEY CHECK (id = 1),
        revision bigint NOT NULL DEFAULT 1,
        document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
        source_sha256 text NOT NULL,
        imported_at timestamptz NOT NULL DEFAULT now()
      )`;
      const existing = await tx`SELECT id FROM cargona_legacy_state LIMIT 1`;
      if (existing.length) throw new Error('Destination already contains state; refusing to overwrite');
      await tx`INSERT INTO cargona_legacy_state (id, document, source_sha256)
        VALUES (1, ${tx.json(state as any)}, ${expected.sha256})`;
      const [readback] = await tx`SELECT document, source_sha256 FROM cargona_legacy_state WHERE id = 1`;
      const actual = inspectState(readback.document);
      if (actual.sha256 !== expected.sha256 || readback.source_sha256 !== expected.sha256) {
        throw new Error('Read-back verification failed');
      }
      verified = true;
      if (!commit) throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  if (!verified) throw new Error('Migration was not verified');
  return { mode: commit ? 'committed' : 'trial-rolled-back', ...expected };
}

export async function readMigratedState(sql: ReturnType<typeof postgres>) {
  const rows = await sql`SELECT document, source_sha256 FROM cargona_legacy_state WHERE id = 1`;
  if (rows.length !== 1) throw new Error('No migrated state found');
  if (inspectState(rows[0].document).sha256 !== rows[0].source_sha256) throw new Error('Stored state checksum mismatch');
  return rows[0].document;
}

export function migrationConnection(url: string) {
  return postgres(url, { max: 1, connect_timeout: 10, idle_timeout: 10, onnotice: () => {} });
}
