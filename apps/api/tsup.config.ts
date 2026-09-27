import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  shims: true,
  clean: true,
  noExternal: ['@cargona/db', '@cargona/types'],
});
