#!/usr/bin/env bash
# Restores only into a new isolated disposable database. Never uses Compose DB.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
fail() { echo "$*" >&2; exit 1; }
source="${1:-}"
image="${2:-}"
[[ -d "$source" && "$image" =~ ^[a-zA-Z0-9][a-zA-Z0-9:./@_-]+$ ]] || fail 'Usage: rehearse.sh <local snapshot directory> <trusted API image>'
[[ -f "$source/checksum" && -f "$source/storage" ]] || fail 'Missing snapshot manifest'
# Refuse links and paths in checksum files before reading any backup data.
[[ -z "$(find "$source" -maxdepth 1 -type l -print -quit)" ]] || fail 'Symlinks are not permitted in a snapshot'
while IFS= read -r line; do
  [[ "$line" =~ ^[a-f0-9]{64}[[:space:]][[:space:]](\./)?[a-zA-Z0-9_.-]+$ ]] || fail 'Invalid checksum entry'
done <"$source/checksum"
mkdir -p "$APP_DIR/data/rehearsals"
chmod 700 "$APP_DIR/data/rehearsals"
work="$(mktemp -d "$APP_DIR/data/rehearsals/check-XXXXXX")"
name="cargona-rehearsal-$(basename "$work" | tr '[:upper:]' '[:lower:]')"
network=''; pg=''; api=''
cleanup() {
  local status=$?
  trap - EXIT
  [[ -z "$api" ]] || docker rm -f -v "$api" >/dev/null 2>&1 || true
  [[ -z "$pg" ]] || docker rm -f -v "$pg" >/dev/null 2>&1 || true
  [[ -z "$network" ]] || docker network rm "$network" >/dev/null 2>&1 || true
  rm -f "$work/db.env"
  printf 'result=%s\ncompleted=%s\n' "$status" "$(date -u +%FT%TZ)" >"$work/result"
  echo "Rehearsal report: $work/result"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cp "$source/"* "$work/"
(cd "$work" && sha256sum --check checksum >/dev/null)
# Pin the local image so mutable tags cannot change between import and API checks.
image="$(docker image inspect --format '{{.Id}}' "$image")"
[[ "$image" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'API image unavailable'
utility_user="$(id -u):$(id -g)"
network="$(docker network create --internal "$name")"
password="$(openssl rand -hex 24)"
printf 'POSTGRES_PASSWORD=%s\nPOSTGRES_USER=rehearsal\nPOSTGRES_DB=rehearsal\nDATABASE_URL=postgres://rehearsal:%s@%s:5432/rehearsal\n' "$password" "$password" "$name" >"$work/db.env"
pg="$(docker run -d --network "$network" --network-alias "$name" --env-file "$work/db.env" postgres:16-alpine)"
ready=false
for n in {1..60}; do
  if docker exec "$pg" pg_isready -U rehearsal -d rehearsal >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || fail 'Disposable PostgreSQL did not become ready'
mode="$(cat "$work/storage")"
if [[ "$mode" == json ]]; then
  [[ -s "$work/state.json" ]] || fail 'Missing JSON state'
  docker run --rm --user "$utility_user" --network none -v "$work:/snapshot" "$image" node apps/api/dist/state-migration.mjs inspect /snapshot/state.json >"$work/source-inspection.json"
  docker run --rm --user "$utility_user" --network "$network" --env-file "$work/db.env" -v "$work:/snapshot" "$image" node apps/api/dist/state-migration.mjs trial /snapshot/state.json >"$work/trial.json"
  docker run --rm --user "$utility_user" --network "$network" --env-file "$work/db.env" -v "$work:/snapshot" "$image" node apps/api/dist/state-migration.mjs import /snapshot/state.json --confirm-stopped >"$work/import.json"
elif [[ "$mode" == postgres ]]; then
  [[ -s "$work/database.dump" ]] || fail 'Missing PostgreSQL archive'
  docker exec -i "$pg" pg_restore --exit-on-error --no-owner --no-privileges -U rehearsal -d rehearsal <"$work/database.dump"
else fail 'Unknown snapshot storage mode'; fi
docker run --rm --user "$utility_user" --network "$network" --env-file "$work/db.env" -v "$work:/snapshot" "$image" node apps/api/dist/state-migration.mjs export /snapshot/restored.json >"$work/restored-inspection.json"
docker exec "$pg" pg_dump -U rehearsal -d rehearsal -Fc >"$work/rehearsed.dump"
if [[ "$mode" == json ]]; then
  docker run --rm --network none -v "$work:/snapshot:ro" --entrypoint node "$image" -e '
    const fs=require("fs");const a=JSON.parse(fs.readFileSync("/snapshot/source-inspection.json"));
    const b=JSON.parse(fs.readFileSync("/snapshot/restored-inspection.json"));if(a.sha256!==b.sha256)process.exit(1);'
fi
# No host ports, internal-only network: copied bot credentials cannot contact Telegram.
api="$(docker run -d --network "$network" --env-file "$work/db.env" -e STORAGE_BACKEND=postgres -e TELEGRAM_BOT_TOKEN= -e APP_DOMAIN=rehearsal.invalid "$image")"
ready=false
for n in {1..45}; do
  if docker exec "$api" node -e 'fetch("http://127.0.0.1:4000/health/ready",{signal:AbortSignal.timeout(2000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || fail 'Restored API readiness failed'
docker restart "$api" >/dev/null
ready=false
for n in {1..45}; do
  if docker exec "$api" node -e 'fetch("http://127.0.0.1:4000/health/ready",{signal:AbortSignal.timeout(2000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || fail 'Restored API did not survive restart'
docker stop "$api" >/dev/null
docker run --rm --user "$utility_user" --network "$network" --env-file "$work/db.env" -v "$work:/snapshot" "$image" node apps/api/dist/state-migration.mjs export /snapshot/after-restart.json >"$work/after-restart-inspection.json"
echo 'Isolated restore, state checksum and API restart passed. Production was not accessed.'
