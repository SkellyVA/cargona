#!/usr/bin/env bash
# Local release operations only. This script is never invoked by the API.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
command -v flock >/dev/null || { echo 'Required: flock (util-linux)' >&2; exit 1; }
docker compose version >/dev/null
RELEASES="$APP_DIR/data/releases"
mkdir -p "$RELEASES"
chmod 700 "$RELEASES"
exec 9>"$RELEASES/.lock"
if [[ "${1:-}" != mode && "${1:-}" != list && "${1:-}" != data-path ]]; then
  flock -n 9 || { echo 'Another release operation is running' >&2; exit 1; }
fi
dc() {
  local files=(-f "$APP_DIR/docker-compose.yml")
  [[ ! -f "$RELEASES/active.yml" ]] || files+=(-f "$RELEASES/active.yml")
  docker compose --project-directory "$APP_DIR" "${files[@]}" "$@"
}
rc() { docker compose --project-directory "$APP_DIR" -f "$1/config.yml" -f "$2" "${@:3}"; }
fail() { echo "$*" >&2; exit 1; }
container() { dc ps -aq "$1"; }
api="$(container backend)"
[[ -n "$api" && "$api" != *$'\n'* ]] || fail 'Exactly one backend container is required'
api_image="$(docker inspect --format '{{.Image}}' "$api")"
[[ "$api_image" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Cannot identify backend image'
mode="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^STORAGE_BACKEND=//p')"
mode="${mode:-json}"
[[ "$mode" == json || "$mode" == postgres ]] || fail 'Unsupported storage backend'
data_source="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' "$api")"
identity() {
  local location
  if [[ "$mode" == json ]]; then location="$data_source";
  else location="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^DATABASE_URL=//p')"; fi
  [[ -n "$location" ]] || return 1
  printf '%s' "$location" | sha256sum | cut -d' ' -f1
}
compatible() {
  docker run --rm --network none --entrypoint node "$1" -e '
    const fs=require("fs");
    try { const v=JSON.parse(fs.readFileSync("/app/apps/api/runtime-compatibility.json","utf8"));
      process.exit(v.storageFormats.includes(process.argv[1]==="postgres"?"postgres-jsonb-v1":"json-v1") &&
        v.stateFormats.includes("cargona-state-v1")?0:1);
    } catch { process.exit(1); }' "$mode"
}
point=''
offline=false
finished=false
candidate_started=false
running=''
activate() { cp "$1" "$RELEASES/active.tmp"; mv "$RELEASES/active.tmp" "$RELEASES/active.yml"; }
resume_edges() {
  local service
  for service in frontend bot caddy; do
    if grep -qx "$service" "$point/running"; then
      rc "$1" "$2" up -d --no-deps --no-build --pull never "$service"
    fi
  done
}
ready() {
  local n
  for n in {1..60}; do
    if rc "$1" "$2" exec -T backend node -e '
      fetch("http://127.0.0.1:4000/health/ready",{signal:AbortSignal.timeout(3000)})
        .then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1));' >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}
recover() {
  local result=$?
  trap - EXIT
  if [[ "$offline" == true && "$finished" == false ]]; then
    echo 'Release failed; external access remains stopped during recovery.' >&2
    dc stop frontend bot caddy backend || true
    if [[ "$candidate_started" == false ]] || { [[ -f "$point/backup.ok" ]] && compatible "$api_image"; }; then
      if rc "$point" "$point/images.yml" up -d --no-deps --no-build --pull never backend &&
         ready "$point" "$point/images.yml" && activate "$point/images.yml" && resume_edges "$point" "$point/images.yml"; then
        echo 'Previous application images restored. Current database preserved.' >&2
      else
        dc stop frontend bot caddy backend || true
        echo "Recovery failed. Services stopped; inspect $point" >&2
      fi
    else echo "Automatic recovery unavailable. Verified backup and old images: $point" >&2; fi
  fi
  exit "$result"
}
trap recover EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

snapshot() {
  point="$(mktemp -d "$RELEASES/release-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
  printf '%s\n' "$mode" >"$point/storage"
  identity >"$point/identity"
  dc config >"$point/config.yml"
  dc config --format json | docker run --rm -i --network none --entrypoint node "$api_image" -e '
    let input="";process.stdin.on("data",b=>input+=b).on("end",()=>{
      const s=JSON.parse(input).services.backend;
      const mode=s.environment.STORAGE_BACKEND||"json";
      const location=mode==="postgres"?s.environment.DATABASE_URL:
        (s.volumes.find(v=>v.target==="/app/data")||{}).source;
      if(!location)process.exit(1);
      console.log(mode);console.log(require("crypto").createHash("sha256").update(location).digest("hex"));
    });' >"$point/config-storage"
  [[ "$(head -n 1 "$point/config-storage")" == "$mode" && "$(tail -n 1 "$point/config-storage")" == "$(identity)" ]] || fail 'Compose storage configuration differs from the running API; do not switch storage during an application update'
  dc ps --status running --services >"$point/running"
  printf 'services:\n' >"$point/images.yml"
  local service cid image tag
  for service in backend frontend bot; do
    cid="$(container "$service")"
    [[ -n "$cid" && "$cid" != *$'\n'* ]] || fail "Missing single container: $service"
    image="$(docker inspect --format '{{.Image}}' "$cid")"
    [[ "$image" =~ ^sha256:[a-f0-9]{64}$ ]] || fail "Invalid image: $service"
    tag="cargona-release-$service:$(basename "$point")"
    docker tag "$image" "$tag"
    printf '  %s:\n    image: "%s"\n' "$service" "$tag" >>"$point/images.yml"
  done
  # The resolved config is private: it contains credentials. Never print it.
  if [[ -f .env ]]; then cp .env "$point/settings.env"; fi
  dc stop frontend bot caddy backend
  offline=true
  if [[ "$mode" == json ]]; then
    local actual_data_dir
    actual_data_dir="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^DATA_DIR=//p')"
    [[ "${actual_data_dir:-/app/data}" == /app/data ]] || fail 'This updater requires DATA_DIR=/app/data'
    [[ -n "$data_source" && -f "$data_source/cargona-store.json" ]] || fail 'JSON store not found in the backend data mount'
    cp "$data_source/cargona-store.json" "$point/state.json"
    docker run --rm --network none -v "$point:/snapshot:ro" --entrypoint node "$api_image" -e '
      try {const s=JSON.parse(require("fs").readFileSync("/snapshot/state.json","utf8"));
      if(!s || typeof s!=="object" || Array.isArray(s) || ("storageFormat" in s && s.storageFormat!=="cargona-state-v1") ||
        !["tenants","customers","packages","users"].every(k=>Array.isArray(s[k])))process.exit(1);
      } catch {console.error("Snapshot validation failed");process.exit(1);}'
    (cd "$point" && sha256sum state.json >checksum)
  else
    local db_name db_user
    db_name="$(dc exec -T postgres sh -c 'printf "%s" "$POSTGRES_DB"')"
    db_user="$(dc exec -T postgres sh -c 'printf "%s" "$POSTGRES_USER"')"
    docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^DATABASE_URL=//p' |
      docker run --rm -i --network none --entrypoint node "$api_image" -e '
        let input="";process.stdin.on("data",b=>input+=b).on("end",()=>{
          try {const u=new URL(input.trim());process.exit(u.hostname==="postgres" && (!u.port||u.port==="5432") &&
            decodeURIComponent(u.pathname.slice(1))===process.argv[1] && decodeURIComponent(u.username)===process.argv[2]?0:1);}
          catch{process.exit(1);}});' "$db_name" "$db_user" || fail 'Backup requires the same local PostgreSQL database used by the backend'
    dc exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$point/database.dump"
    [[ -s "$point/database.dump" ]] || fail 'Empty PostgreSQL backup'
    dc exec -T postgres pg_restore --list <"$point/database.dump" >"$point/dump-contents"
    rc "$point" "$point/images.yml" run --rm --no-deps --pull never --user "$(id -u):$(id -g)" -v "$point:/snapshot" backend node apps/api/dist/state-migration.mjs export /snapshot/state.json
    docker run --rm --network none -v "$point:/snapshot:ro" --entrypoint node "$api_image" -e '
      const s=JSON.parse(require("fs").readFileSync("/snapshot/state.json","utf8"));
      if("storageFormat" in s && s.storageFormat!=="cargona-state-v1")process.exit(1);'
    (cd "$point" && sha256sum database.dump state.json >checksum)
  fi
  (cd "$point" && sha256sum --check checksum >/dev/null)
  sync "$point/state.json" "$point/config.yml" "$point/images.yml" "$point/checksum"
  [[ ! -f "$point/database.dump" ]] || sync "$point/database.dump"
  touch "$point/backup.ok"
  sync "$point/backup.ok"
}

case "${1:-}" in
  mode) printf '%s\n' "$mode"; finished=true ;;
  data-path)
    [[ "$mode" == json && -n "$data_source" ]] || fail 'JSON data mount unavailable'
    printf '%s/cargona-store.json\n' "$data_source"
    finished=true ;;
  list)
    for entry in "$RELEASES"/release-*; do
      [[ -f "$entry/backup.ok" ]] && printf '%s (%s)\n' "$(basename "$entry")" "$(cat "$entry/storage")"
    done
    finished=true ;;
  backup)
    snapshot
    if grep -qx backend "$point/running"; then
      rc "$point" "$point/images.yml" start backend
      ready "$point" "$point/images.yml"
    fi
    resume_edges "$point" "$point/images.yml"
    finished=true
    echo "Verified backup: $point"
    ;;
  update|rollback)
    operation="$1"
    target="${2:-}"
    if [[ "$operation" == update ]]; then
      [[ "$target" =~ ^[a-f0-9]{40}$ ]] || fail 'Usage: cargona update <full 40-character Git commit SHA>'
      owner="${CARGONA_IMAGE_OWNER:-skellyva}"
      [[ "$owner" =~ ^[a-z0-9][a-z0-9-]*$ ]] || fail 'Invalid image owner'
      candidate_ids=()
      for service in api web bot; do
        docker pull "ghcr.io/$owner/cargona-$service:$target"
        image_id="$(docker image inspect --format '{{.Id}}' "ghcr.io/$owner/cargona-$service:$target")"
        [[ "$image_id" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Pulled image could not be pinned'
        candidate_ids+=("$image_id")
      done
      candidate_api="ghcr.io/$owner/cargona-api:$target"
      compatible "$candidate_api" || fail 'Target API does not declare compatibility with the current storage format'
    else
      [[ "$target" =~ ^release-[0-9]{8}T[0-9]{6}Z-[a-zA-Z0-9]{6}$ ]] || fail 'Usage: cargona rollback <release ID from rollback:list>'
      destination="$RELEASES/$target"
      [[ -f "$destination/backup.ok" ]] || fail 'Incomplete rollback point'
      [[ "$(cat "$destination/storage")" == "$mode" && "$(cat "$destination/identity")" == "$(identity)" ]] || fail 'Storage mode or database location changed; follow the migration rollback runbook'
      (cd "$destination" && sha256sum --check checksum >/dev/null)
      candidate_api="cargona-release-backend:$target"
      compatible "$candidate_api" || fail 'Old API has no compatible storage declaration; rehearse recovery before using it'
    fi
    snapshot
    if [[ "$operation" == update ]]; then
      printf 'services:\n  backend:\n    image: "%s"\n  frontend:\n    image: "%s"\n  bot:\n    image: "%s"\n' "${candidate_ids[@]}" >"$point/candidate.yml"
      printf '%s\n' "$target" >"$point/target-commit"
      target_config="$point"
      target_images="$point/candidate.yml"
    else
      target_config="$destination"
      target_images="$destination/images.yml"
    fi
    candidate_started=true
    rc "$target_config" "$target_images" up -d --no-deps --no-build --pull never backend
    ready "$target_config" "$target_images"
    activate "$target_images"
    resume_edges "$target_config" "$target_images"
    finished=true
    echo "Application $operation completed. Database preserved. Previous images and backup: $(basename "$point")"
    ;;
  *) fail 'Usage: release.sh backup|list|mode|update <SHA>|rollback <release ID>' ;;
esac
