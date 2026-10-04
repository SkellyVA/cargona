#!/usr/bin/env bash
# Restore dotenv references in a resolved JSON Compose file without restarting services.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
mkdir -p data/releases
exec 9>data/releases/.lock
flock -n 9 || { echo 'Another release operation is running' >&2; exit 1; }
stage="$(mktemp -d "$APP_DIR/data/releases/env-repair-XXXXXX")"
trap 'rm -f -- "$stage/convert.cjs"' EXIT
cp -p docker-compose.yml "$stage/compose.before"
cp -p .env "$stage/env.before"
docker compose config --format json >"$stage/resolved.before.json"
image="$(docker inspect --format '{{.Image}}' "$(docker compose ps -q backend)")"
[[ "$image" =~ ^sha256:[a-f0-9]{64}$ ]] || { echo 'Running backend required' >&2; exit 1; }
cat >"$stage/convert.cjs" <<'NODE'
const fs = require('node:fs');
const dir = '/repair';
const config = JSON.parse(fs.readFileSync(`${dir}/resolved.before.json`, 'utf8'));
// Missing STORAGE_BACKEND means JSON; make that default explicitly configurable.
config.services.backend.environment.STORAGE_BACKEND ??= 'json';
const values = new Map();
const literal = value => String(value ?? '').replaceAll('$$', '$');
function bind(service, key, variable = key) {
  const env = config.services[service]?.environment;
  if (!env || !(key in env)) return;
  const value = literal(env[key]);
  if (/[\r\n\0]/.test(value)) throw new Error(`Multiline value unsupported: ${variable}`);
  if (values.has(variable) && values.get(variable) !== value)
    throw new Error(`Conflicting service values: ${variable}`);
  values.set(variable, value);
  env[key] = '${' + variable + '}';
}
for (const key of ['STORAGE_BACKEND', 'JWT_SECRET', 'APP_DOMAIN', 'TELEGRAM_BOT_TOKEN',
  'SUPERADMIN_EMAIL', 'SUPERADMIN_PASSWORD', 'SUPERADMIN_NAME', 'MAX_TENANTS_LIMIT',
  'ENABLE_NOOR_CLUB', 'ENABLE_NOOR_CLUB_TENANTS', 'ALLOWED_LOYALTY_TENANTS'])
  bind('backend', key);
for (const [key, variable] of Object.entries({POSTGRES_USER:'DB_USER',
  POSTGRES_PASSWORD:'DB_PASSWORD', POSTGRES_DB:'DB_NAME'})) bind('postgres', key, variable);
bind('bot', 'TELEGRAM_BOT_TOKEN');
bind('bot', 'WEBAPP_URL');
bind('caddy', 'APP_DOMAIN');
bind('caddy', 'SUPERADMIN_EMAIL');
const backend = config.services.backend.environment;
if (backend.DATABASE_URL) {
  const expected = `postgres://${values.get('DB_USER')}:${values.get('DB_PASSWORD')}@postgres:5432/${values.get('DB_NAME')}`;
  if (literal(backend.DATABASE_URL) !== expected)
    throw new Error('Custom DATABASE_URL: automatic repair refused');
  backend.DATABASE_URL = 'postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}';
}
let envText = fs.readFileSync(`${dir}/env.before`, 'utf8');
envText = envText.split(/\r?\n/).filter(line => {
  const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
  return !match || !values.has(match[1]);
}).join('\n').replace(/\n*$/, '\n');
for (const [key, value] of values)
  envText += `${key}='${value.replaceAll("'", "\\'")}'\n`;
fs.writeFileSync(`${dir}/env.next`, envText, {mode:0o600});
fs.writeFileSync(`${dir}/compose.next`, JSON.stringify(config, null, 2) + '\n', {mode:0o600});
NODE
docker run --rm --network none --user "$(id -u):$(id -g)" \
  -v "$stage:/repair" --entrypoint node "$image" /repair/convert.cjs
docker compose --project-directory "$APP_DIR" --env-file "$stage/env.next" \
  -f "$stage/compose.next" config --format json >"$stage/resolved.after.json"
docker run --rm --network none --user "$(id -u):$(id -g)" \
  -v "$stage:/repair:ro" --entrypoint node "$image" -e '
  const fs=require("fs"), assert=require("node:assert/strict");
  const before=JSON.parse(fs.readFileSync("/repair/resolved.before.json"));
  before.services.backend.environment.STORAGE_BACKEND ??= "json";
  assert.deepStrictEqual(JSON.parse(fs.readFileSync("/repair/resolved.after.json")), before);
  console.log("Resolved Compose unchanged; dotenv references verified.");'
# Keep the candidate configuration separate until both files have been validated.
cp "$stage/env.next" .env.next
cp "$stage/compose.next" docker-compose.yml.next
chmod 600 .env.next docker-compose.yml.next
mv .env.next .env
mv docker-compose.yml.next docker-compose.yml
echo "Dotenv references restored. No containers restarted. Backup: $stage"
