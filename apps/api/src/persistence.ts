import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function replaceFile(file: string, contents: string) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, contents, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
    if (process.platform !== 'win32') {
      const directory = fs.openSync(path.dirname(file), 'r');
      try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export function writeState(file: string, state: unknown) {
  const contents = JSON.stringify(state, null, 2);
  if (fs.existsSync(file)) {
    const previous = fs.readFileSync(file, 'utf8');
    JSON.parse(previous);
    replaceFile(`${file}.previous`, previous);
  }
  replaceFile(file, contents);
}
