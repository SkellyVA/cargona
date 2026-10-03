import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { server: 'src/server.ts', 'state-migration': 'src/state-migration-cli.ts' },
    format: ['esm'],
    target: 'node20',
    platform: 'node',
    shims: true,
    clean: false,
    noExternal: ['@cargona/db', '@cargona/types'],
  },
  {
    entry: { importer: 'src/importer/cli.ts' },
    format: ['cjs'],
    target: 'node20',
    platform: 'node',
    shims: true,
    clean: false,
    noExternal: ['@cargona/db', '@cargona/types', 'mongodb'],
  },
]);
