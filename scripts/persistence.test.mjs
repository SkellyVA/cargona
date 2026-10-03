import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeState } from '../apps/api/src/persistence.ts';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-persistence-'));
const file = path.join(directory, 'store.json');
const realRename = fs.renameSync;
try {
  writeState(file, { customers: [{ id: 'first' }] });
  writeState(file, { customers: [{ id: 'second' }] });
  assert.equal(JSON.parse(fs.readFileSync(file)).customers[0].id, 'second');
  assert.equal(JSON.parse(fs.readFileSync(`${file}.previous`)).customers[0].id, 'first');
  fs.renameSync = (from, to) => {
    if (to === file) throw new Error('simulated disk failure');
    return realRename(from, to);
  };
  assert.throws(() => writeState(file, { customers: [] }), /simulated disk failure/);
  assert.equal(JSON.parse(fs.readFileSync(file)).customers[0].id, 'second');
  assert.equal(JSON.parse(fs.readFileSync(`${file}.previous`)).customers[0].id, 'second');
  assert.equal(fs.readdirSync(directory).filter(name => name.endsWith('.tmp')).length, 0);
  fs.renameSync = realRename;
  fs.writeFileSync(file, 'corrupted');
  assert.throws(() => writeState(file, { customers: [] }), SyntaxError);
  assert.equal(JSON.parse(fs.readFileSync(`${file}.previous`)).customers[0].id, 'second');
  console.log('Persistence checks passed: atomic replace, previous copy, failed write and corrupted source');
} finally {
  fs.renameSync = realRename;
  fs.rmSync(directory, { recursive: true, force: true });
}
