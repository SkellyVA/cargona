#!/usr/bin/env bash
# Serial offline writers; snapshots first, restores application availability on exit.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
fail() { echo "$*" >&2; exit 1; }
dc() {
  local files=(-f "$APP_DIR/docker-compose.yml")
  [[ ! -f "$APP_DIR/data/releases/active.yml" ]] || files+=(-f "$APP_DIR/data/releases/active.yml")
  docker compose --project-directory "$APP_DIR" "${files[@]}" "$@"
}
operation="${1:-}"; shift || true
[[ "$operation" == owner-reset || "$operation" == import ]] || fail 'Usage: maintenance.sh owner-reset|import [importer arguments]'
bash "$APP_DIR/release.sh" backup
exec 9>"$APP_DIR/data/releases/.lock"
flock -n 9 || fail 'Another release operation is running'
running="$(dc ps --status running --services)"
stopped=false
resume() {
  local result=$?
  trap - EXIT
  if [[ "$stopped" == true ]]; then
    dc up -d --no-deps --no-build --pull never backend || exit 1
    local ready=false
    for n in {1..60}; do
      if dc exec -T backend node -e 'fetch("http://127.0.0.1:4000/health/ready",{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then ready=true; break; fi
      sleep 1
    done
    [[ "$ready" == true ]] || { echo 'API recovery failed; external services remain stopped' >&2; exit 1; }
    for service in frontend bot caddy; do
      if grep -qx "$service" <<<"$running"; then dc up -d --no-deps --no-build --pull never "$service" || exit 1; fi
    done
  fi
  exit "$result"
}
trap resume EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
[[ "$(dc ps -q backend)" != '' ]] || fail 'Running backend is required for maintenance'
stopped=true
dc stop frontend bot caddy backend
if [[ "$operation" == owner-reset ]]; then
  dc run --rm --no-deps --pull never -T backend node apps/api/dist/maintenance.mjs owner-reset --confirm-stopped
else
  args=("$@"); mounts=()
  for ((i=0; i<${#args[@]}; i++)); do
    if [[ "${args[i]}" == --dir ]]; then
      ((i+1<${#args[@]})) || fail 'Missing import directory'
      directory="$(cd "${args[i+1]}" && pwd)"
      mounts=(-v "$directory:/import:ro"); args[i+1]=/import
    fi
  done
  dc run --rm --no-deps --pull never -T "${mounts[@]}" backend node apps/api/dist/importer.js "${args[@]}"
fi
