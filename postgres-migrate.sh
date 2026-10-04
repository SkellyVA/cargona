#!/usr/bin/env bash
# Explicit operator migration; never invoked during an application update.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
dc() {
  local files=(-f "$APP_DIR/docker-compose.yml")
  [[ ! -f data/releases/active.yml ]] || files+=(-f "$APP_DIR/data/releases/active.yml")
  docker compose --project-directory "$APP_DIR" "${files[@]}" "$@"
}
fail() { echo "$*" >&2; exit 1; }
operation="${1:-status}"
[[ "$operation" =~ ^(status|inspect|trial|rehearse|apply)$ ]] || fail 'Usage: postgres-migrate.sh status|inspect|trial|rehearse|apply'
api="$(dc ps -q backend)"
[[ -n "$api" && "$api" != *$'\n'* ]] || fail 'Exactly one running backend required'
mode="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^STORAGE_BACKEND=//p')"
mode="${mode:-json}"
if [[ "$operation" == status ]]; then
  echo "Storage backend: $mode"
  echo 'JSON → PostgreSQL preserves the whole state as JSONB. Updates never migrate automatically.'
  exit 0
fi
[[ "$mode" == json ]] || fail 'Migration requires a running JSON backend; existing PostgreSQL state is never replaced'
source_dir="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' "$api")"
[[ -f "$source_dir/cargona-store.json" ]] || fail 'Mounted JSON store not found'
image="$(docker inspect --format '{{.Image}}' "$api")"
if [[ "$operation" == apply ]]; then
  read -r -p 'Migration pauses access. Type MIGRATE to confirm JSON → PostgreSQL: ' confirmation
  [[ "$confirmation" == MIGRATE ]] || fail 'Cancelled'
  bash "$APP_DIR/release.sh" backup
fi
mkdir -p data/releases
exec 9>data/releases/.lock
flock -n 9 || fail 'Another release operation is running'
work="$(mktemp -d "$APP_DIR/data/releases/migration-XXXXXX")"
echo "Private migration files: $work"
copy_source() {
  cp "$source_dir/cargona-store.json" "$work/state.json"
  printf 'json\n' >"$work/storage"
  (cd "$work" && sha256sum state.json storage >checksum)
}
tool() {
  dc run --rm --no-deps --pull never -T --user "$(id -u):$(id -g)" \
    -v "$work:/migration" backend node apps/api/dist/state-migration.mjs "$@"
}
copy_source
if [[ "$operation" == inspect ]]; then tool inspect /migration/state.json; exit; fi
dc config --format json | docker run --rm -i --network none --entrypoint node "$image" -e '
  let input="";process.stdin.on("data",b=>input+=b).on("end",()=>{
    const c=JSON.parse(input), pg=c.services.postgres?.environment;
    const literal=s=>String(s??"").replaceAll("$$","$");
    const url=new URL(literal(c.services.backend.environment.DATABASE_URL));
    if(!pg || !["postgres:","postgresql:"].includes(url.protocol) || url.hostname!=="postgres" ||
      (url.port&&url.port!=="5432") || decodeURIComponent(url.username)!==literal(pg.POSTGRES_USER) ||
      decodeURIComponent(url.pathname.slice(1))!==literal(pg.POSTGRES_DB))
      throw Error("Migration requires the local Compose PostgreSQL database");});'
if [[ "$operation" == trial ]]; then
  tool inspect /migration/state.json
  tool trial /migration/state.json
  echo 'Trial rolled back its transaction; application still uses JSON.'
  exit
fi
# Real isolated import/export and API restart; no production DB writes.
bash "$APP_DIR/rehearse.sh" "$work" "$image"
[[ "$operation" == apply ]] || exit 0
running="$(dc ps --status running --services)"
services=()
for service in frontend bot caddy backend; do
  if grep -qx "$service" <<<"$running"; then services+=("$service"); fi
done
cp -p .env "$work/env.before"
stopped=false
postgres_started=false
ready() {
  local n
  for n in {1..60}; do
    if dc exec -T backend node -e 'fetch("http://127.0.0.1:4000/health/ready",{signal:AbortSignal.timeout(3000)}).then(async r=>{const b=await r.json();process.exit(r.ok&&b.backend===process.argv[1]?0:1)}).catch(()=>process.exit(1))' "$1" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}
resume_edges() {
  local service
  for service in frontend bot caddy; do
    if grep -qx "$service" <<<"$running"; then dc up -d --no-deps --no-build --pull never "$service"; fi
  done
}
recover() {
  local result=$?
  trap - EXIT
  if [[ "$stopped" == true ]]; then
    dc stop "${services[@]}" || true
    if [[ "$postgres_started" == false ]]; then
      cp "$work/env.before" .env.recovery
      chmod 600 .env.recovery
      mv .env.recovery .env
      if dc up -d --no-deps --no-build --pull never backend && ready json; then
        resume_edges || true
        echo 'JSON service restored. Any committed PostgreSQL copy retained; do not delete it blindly.' >&2
      else echo 'JSON recovery failed; services remain stopped.' >&2; fi
    else
      echo 'PostgreSQL API was started; services remain stopped to preserve possible new writes. Do not switch to stale JSON.' >&2
    fi
  fi
  exit "$result"
}
trap recover EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
stopped=true
dc stop "${services[@]}"
# Final source is captured only after writers stop; rehearsal copy may be older.
copy_source
# Replace only this key, preserving every other operator setting.
sed '/^[[:space:]]*\(export[[:space:]]\+\)\?STORAGE_BACKEND[[:space:]]*=/d' .env >.env.migration
printf "STORAGE_BACKEND='postgres'\n" >>.env.migration
chmod 600 .env.migration
mv .env.migration .env
dc config --format json | docker run --rm -i --network none --entrypoint node "$image" -e '
  let input="";process.stdin.on("data",b=>input+=b).on("end",()=>{
    if(JSON.parse(input).services.backend.environment.STORAGE_BACKEND!=="postgres")
      throw Error("Compose must reference STORAGE_BACKEND from dotenv");});'
tool inspect /migration/state.json >"$work/source-report.json"
tool trial /migration/state.json
tool import /migration/state.json --confirm-stopped
tool export /migration/roundtrip.json >"$work/export-report.json"
docker run --rm --network none -v "$work:/migration:ro" --entrypoint node "$image" -e '
  const fs=require("fs");
  const a=JSON.parse(fs.readFileSync("/migration/source-report.json"));
  const b=JSON.parse(fs.readFileSync("/migration/export-report.json"));
  if(!a.sha256 || a.sha256!==b.sha256) throw Error("Migration checksum mismatch");'
postgres_started=true
dc up -d --no-deps --no-build --pull never backend
ready postgres
dc restart backend
ready postgres
resume_edges
stopped=false
echo "Migration complete: PostgreSQL ready after restart; original JSON retained. Reports: $work"
