import fs from 'node:fs';
import path from 'node:path';
import { migrationConnection, transferState, readMigratedState, inspectState } from '@cargona/db';

async function main() {
  const [command, file, ...flags] = process.argv.slice(2);
  if (!['trial', 'import', 'export', 'inspect'].includes(command) || !file ||
      flags.some(flag => flag !== '--confirm-stopped') ||
      (command !== 'import' && flags.length) ||
      (command === 'import' && !flags.includes('--confirm-stopped'))) {
    throw new Error('Usage: state-migration <inspect|trial|export> <file> OR state-migration import <file> --confirm-stopped');
  }
  const filename = path.resolve(file);
  const source = command === 'export' ? undefined : fs.readFileSync(filename, 'utf8');
  const document = source === undefined ? undefined : JSON.parse(source);
  if (command === 'inspect') {
    console.log(JSON.stringify(inspectState(document), null, 2));
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const sql = migrationConnection(process.env.DATABASE_URL);
  try {
    if (command === 'export') {
      const restored = await readMigratedState(sql);
      // Never replace an existing file, including the live JSON store.
      const fd = fs.openSync(filename, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, `${JSON.stringify(restored, null, 2)}\n`);
        fs.fsyncSync(fd);
      } catch (error) {
        fs.closeSync(fd);
        fs.unlinkSync(filename);
        throw error;
      }
      fs.closeSync(fd);
      console.log(JSON.stringify({ mode: 'exported', ...inspectState(restored) }, null, 2));
    } else {
      console.log(JSON.stringify(await transferState(sql, document, command === 'import'), null, 2));
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  // Driver errors may include connection credentials or complete SQL values.
  console.error('State migration failed. Check the command, source JSON and destination connection. No existing state is overwritten.');
  process.exitCode = 1;
});
