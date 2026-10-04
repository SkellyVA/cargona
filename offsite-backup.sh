#!/usr/bin/env bash
# Operator-only encrypted backups. No production restore or application restart.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
ROOT="$APP_DIR/data/offsite"
mkdir -p "$ROOT" "$APP_DIR/data/releases"
chmod 700 "$ROOT"
fail() { echo "$*" >&2; exit 1; }
operation="${1:-}"
[[ "$operation" =~ ^(configure|init|run|list|check|restore|prune|enable|disable|status|install-restic)$ ]] || fail 'Неизвестная команда внешних копий. Используйте cargona help.'
if [[ "$operation" == install-restic ]]; then
  if command -v restic >/dev/null; then restic version; exit 0; fi
  [[ "$EUID" == 0 ]] || fail 'Установка требует root. Для Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y restic'
  command -v apt-get >/dev/null || fail 'Автоустановка поддерживает Debian/Ubuntu. Установите restic через пакетный менеджер вашей ОС.'
  echo 'Будет установлен пакет restic через apt. Данные и контейнеры приложения не изменяются.'
  read -r -p 'Установить restic? [y/N]: ' answer
  [[ "$answer" =~ ^[Yy]$ ]] || { echo 'Установка отменена'; exit 0; }
  apt-get update
  apt-get install -y restic
  restic version
  exit 0
fi
if [[ "$operation" == status ]]; then
  echo 'Внешние резервные копии'
  if command -v restic >/dev/null; then restic version; else echo 'Restic: не установлен (пункт 11 меню внешних копий)'; fi
  if [[ -f "$ROOT/restic.env" ]]; then echo 'Хранилище: настроено'; else echo 'Хранилище: не настроено'; fi
  if [[ -f "$ROOT/last-success" ]]; then printf 'Последняя успешная копия: '; cat "$ROOT/last-success";
  else echo 'Успешных копий ещё нет'; fi
  if [[ -f "$ROOT/last-attempt" ]]; then
    read -r timestamp code <"$ROOT/last-attempt"
    if [[ "$code" == 0 ]]; then echo "Последняя попытка: $timestamp — успешно";
    else echo "Последняя попытка: $timestamp — ошибка (код $code)"; fi
  fi
  if command -v systemctl >/dev/null && systemctl is-active --quiet cargona-backup.timer; then
    echo 'Расписание: включено (каждые 15 минут)'
  else echo 'Расписание: выключено или systemd недоступен'; fi
  exit 0
fi
if [[ "$operation" == disable ]]; then
  command -v systemctl >/dev/null || fail 'Для расписания нужен systemd'
  systemctl disable --now cargona-backup.timer
  exit 0
fi
command -v restic >/dev/null || fail $'Restic не установлен. Выберите пункт 11 в меню внешних копий.\nДля Debian/Ubuntu вручную: sudo apt-get update && sudo apt-get install -y restic'
command -v flock >/dev/null || fail 'Не найден flock. Установите пакет util-linux.'
exec 9>"$APP_DIR/data/releases/.lock"
flock -n 9 || fail 'Уже выполняется бэкап, миграция или обновление. Дождитесь завершения.'
if [[ "${1:-}" == configure ]]; then
  [[ ! -f "$ROOT/restic.env" ]] || fail "Настройки уже существуют: $ROOT/restic.env. Повторная настройка не заменяет ключи автоматически."
  printf '\nНастройка Backblaze B2\nНужны bucket, Application Key ID и Application Key с доступом к этому bucket.\nПароль шифрования создайте отдельно и сохраните вне сервера: без него копии не восстановить.\n\n'
  read -r -p 'Название B2 bucket: ' bucket
  [[ "$bucket" =~ ^[a-zA-Z0-9-]+$ ]] || fail 'Название bucket может содержать латинские буквы, цифры и дефис'
  read -r -p 'B2 Application Key ID: ' account
  read -r -s -p 'B2 Application Key (ввод скрыт): ' token; printf '\n'
  read -r -s -p 'Пароль шифрования (16+ символов, ввод скрыт): ' password; printf '\n'
  read -r -s -p 'Повторите пароль: ' repeated; printf '\n'
  [[ -n "$account" && -n "$token" && ${#password} -ge 16 && "$password" == "$repeated" && "$account$token$password" != *$'\r'* ]] || fail 'Укажите оба ключа и совпадающий пароль от 16 символов без переводов строки'
  printf 'RESTIC_REPOSITORY=b2:%s:cargona\nB2_ACCOUNT_ID=%s\nB2_ACCOUNT_KEY=%s\nRESTIC_PASSWORD=%s\n' "$bucket" "$account" "$token" "$password" >"$ROOT/restic.env"
  echo 'Настройки сохранены. Далее: 2 — инициализация, 3 — первая копия, 4 — включить расписание.'
  exit 0
fi
[[ -f "$ROOT/restic.env" ]] || fail 'Хранилище ещё не настроено. Выберите пункт 1 в меню внешних копий.'
# Docker env-file syntax, deliberately never source executable shell configuration.
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "$line" || "$line" == \#* ]] && continue
  key="${line%%=*}"
  case "$key" in
    RESTIC_REPOSITORY|RESTIC_PASSWORD|B2_ACCOUNT_ID|B2_ACCOUNT_KEY|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_DEFAULT_REGION)
      [[ "$line" == *=* ]] || fail 'Invalid backup configuration'
      export "$key=${line#*=}" ;;
    *) fail 'Unsupported backup configuration key' ;;
  esac
done <"$ROOT/restic.env"
[[ -n "${RESTIC_PASSWORD:-}" && -n "${RESTIC_REPOSITORY:-}" ]] || fail 'Repository and encryption password are required'
[[ "$RESTIC_REPOSITORY" == b2:* || "$RESTIC_REPOSITORY" == s3:https://* ]] || fail 'Use an external B2 or HTTPS S3 repository'
chmod 600 "$ROOT/restic.env"
export RESTIC_CACHE_DIR="$ROOT/cache"
rest() { restic "$@"; }
dc() {
  local files=(-f "$APP_DIR/docker-compose.yml")
  [[ ! -f "$APP_DIR/data/releases/active.yml" ]] || files+=(-f "$APP_DIR/data/releases/active.yml")
  docker compose --project-directory "$APP_DIR" "${files[@]}" "$@"
}
stage=''
cleanup() {
  local result=$?
  trap - EXIT
  [[ -z "$stage" ]] || rm -rf -- "$stage"
  if [[ "$operation" == run && -d "$ROOT/snapshot" ]]; then
    find "$ROOT/snapshot" -maxdepth 1 -type f -delete
  fi
  if [[ "${1:-}" == run ]]; then
    printf '%s %s\n' "$(date -u +%FT%TZ)" "$result" >"$ROOT/last-attempt.tmp"
    mv "$ROOT/last-attempt.tmp" "$ROOT/last-attempt"
  fi
  exit "$result"
}
trap 'cleanup "$operation"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
case "$operation" in
  init) rest init ;;
  list) rest snapshots --tag cargona ;;
  check) rest check --read-data ;;
  restore)
    snapshot_id="${2:-}"
    [[ "$snapshot_id" =~ ^[a-f0-9]{8,64}$ ]] || fail 'Use a snapshot ID from offsite:list'
    target="$(mktemp -d "$ROOT/restored-XXXXXX")"
    rest restore "$snapshot_id" --target "$target"
    echo "Decrypted copy restored only into a new private directory: $target"
    ;;
  prune)
    # Only this application's stable host/path group; never delete unrelated backups.
    rest forget --tag cargona --host cargona --path "$ROOT/snapshot" --keep-within 24h --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune ;;
  run)
    stage="$(mktemp -d "$ROOT/staging-XXXXXX")"
    api="$(dc ps -q backend)"
    [[ -n "$api" && "$api" != *$'\n'* ]] || fail 'Exactly one running backend is required'
    mode="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^STORAGE_BACKEND=//p')"
    mode="${mode:-json}"
    image="$(docker inspect --format '{{.Image}}' "$api")"
    [[ "$image" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Cannot identify backend image'
    if [[ "$mode" == json ]]; then
      data_dir="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^DATA_DIR=//p')"
      [[ "${data_dir:-/app/data}" == /app/data ]] || fail 'Expected DATA_DIR=/app/data'
      source_dir="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' "$api")"
      [[ -n "$source_dir" ]] || fail 'Backend data mount unavailable'
      # Atomic writer replaces the pathname; cp reads one complete opened inode.
      cp "$source_dir/cargona-store.json" "$stage/state.json"
    elif [[ "$mode" == postgres ]]; then
      db_name="$(dc exec -T postgres sh -c 'printf "%s" "$POSTGRES_DB"')"
      db_user="$(dc exec -T postgres sh -c 'printf "%s" "$POSTGRES_USER"')"
      docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api" | sed -n 's/^DATABASE_URL=//p' |
        docker run --rm -i --network none --entrypoint node "$image" -e '
          let s="";process.stdin.on("data",b=>s+=b).on("end",()=>{
            try{const u=new URL(s.trim());process.exit(u.hostname==="postgres"&&(!u.port||u.port==="5432")&&
              decodeURIComponent(u.pathname.slice(1))===process.argv[1]&&decodeURIComponent(u.username)===process.argv[2]?0:1)}catch{process.exit(1)}});' "$db_name" "$db_user" || fail 'PostgreSQL target differs from running backend'
      dc exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$stage/database.dump"
      [[ -s "$stage/database.dump" ]] || fail 'Empty database dump'
      dc exec -T postgres pg_restore --list <"$stage/database.dump" >"$stage/dump-contents"
    else fail 'Unsupported storage backend'; fi
    if [[ "$mode" == json ]]; then
      docker run --rm --network none -v "$stage:/snapshot:ro" --entrypoint node "$image" -e '
        try{const s=JSON.parse(require("fs").readFileSync("/snapshot/state.json","utf8"));
          if(!s||typeof s!=="object"||Array.isArray(s)||("storageFormat" in s&&s.storageFormat!=="cargona-state-v1")||
            !["tenants","customers","packages","users"].every(k=>Array.isArray(s[k])))process.exit(1);
        }catch{console.error("Invalid JSON snapshot");process.exit(1)}'
    fi
    dc config >"$stage/config.yml"
    [[ ! -f .env ]] || cp .env "$stage/settings.env"
    printf '%s\n' "$mode" >"$stage/storage"
    printf '%s\n' "$image" >"$stage/api-image"
    docker image inspect --format '{{json .RepoDigests}}' "$image" >"$stage/api-repodigests.json"
    (cd "$stage" && sha256sum ./* >checksum && sha256sum --check checksum >/dev/null)
    # Stable path enables deduplication and a single retention group.
    mkdir -p "$ROOT/snapshot"
    find "$ROOT/snapshot" -maxdepth 1 -type f -delete
    cp "$stage/"* "$ROOT/snapshot/"
    (cd "$ROOT" && rest backup snapshot --host cargona --tag cargona)
    date -u +%FT%TZ >"$ROOT/last-success.tmp"
    mv "$ROOT/last-success.tmp" "$ROOT/last-success"
    find "$ROOT/snapshot" -maxdepth 1 -type f -delete
    # Retention runs at most once per UTC day, only after a successful upload.
    today="$(date -u +%F)"
    if [[ ! -f "$ROOT/last-prune" || "$(cat "$ROOT/last-prune")" != "$today" ]]; then
      rest forget --tag cargona --host cargona --path "$ROOT/snapshot" --keep-within 24h --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
      printf '%s\n' "$today" >"$ROOT/last-prune"
    fi
    ;;
  enable)
    [[ "$APP_DIR" =~ ^/[a-zA-Z0-9_./-]+$ ]] || fail 'Timer installation requires a simple absolute Linux path'
    [[ -f "$ROOT/last-success" ]] || fail 'Сначала создайте первую успешную копию: пункт 3. Затем включите расписание.'
    command -v systemctl >/dev/null || fail 'systemd is required'
    cat >/etc/systemd/system/cargona-backup.service <<EOF
[Unit]
Description=Cargona encrypted offsite backup
After=docker.service network-online.target
Wants=network-online.target
[Service]
Type=oneshot
ExecStart=/bin/bash $APP_DIR/offsite-backup.sh run
UMask=0077
Nice=10
TimeoutStartSec=14min
EOF
    cat >/etc/systemd/system/cargona-backup.timer <<'EOF'
[Unit]
Description=Cargona backup every 15 minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=15min
AccuracySec=30s
Persistent=true
[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable --now cargona-backup.timer ;;
  disable) systemctl disable --now cargona-backup.timer ;;
  *) fail 'Usage: offsite-backup.sh configure|init|run|list|check|restore <snapshot ID>|prune|enable|disable|status' ;;
esac
