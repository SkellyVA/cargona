#!/usr/bin/env bash
# Local checks, opt-in notification transport; no webhook mutations.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
ROOT="$APP_DIR/data/monitor"
mkdir -p "$ROOT"
chmod 700 "$ROOT"
fail() { echo "$*" >&2; exit 1; }
dc() {
  local files=(-f "$APP_DIR/docker-compose.yml")
  [[ ! -f "$APP_DIR/data/releases/active.yml" ]] || files+=(-f "$APP_DIR/data/releases/active.yml")
  docker compose --project-directory "$APP_DIR" "${files[@]}" "$@"
}
case "${1:-}" in
  configure)
    [[ ! -f "$ROOT/telegram.env" ]] || fail "Настройки уже существуют: $ROOT/telegram.env. Они не заменяются автоматически."
    echo 'Используйте отдельного бота для мониторинга и ID своего личного чата.'
    read -r -s -p 'Токен бота (ввод скрыт): ' token; printf '\n'
    read -r -p 'Telegram ID получателя (положительное число): ' chat
    [[ "$token" =~ ^[0-9]+:[a-zA-Z0-9_-]+$ && "$chat" =~ ^[1-9][0-9]*$ ]] || fail 'Нужны корректный токен и ID личного чата. Группы не поддерживаются.'
    printf '%s\n%s\n' "$token" "$chat" >"$ROOT/telegram.env"
    chmod 600 "$ROOT/telegram.env"
    echo 'Настройки сохранены. Далее: 2 — разовая проверка, 3 — включить расписание.'
    ;;
  run)
    command -v flock >/dev/null
    exec 8>"$ROOT/.lock"
    flock -n 8 || exit 0
    issues="$(mktemp "$ROOT/issues-XXXXXX")"
    trap 'rm -f -- "$issues"' EXIT
    for service in backend frontend caddy; do
      id="$(dc ps -q "$service" 2>/dev/null || true)"
      [[ -n "$id" && "$id" != *$'\n'* ]] || { echo "$service: not running" >>"$issues"; continue; }
      status="$(docker inspect --format '{{.State.Status}} {{.State.OOMKilled}}' "$id" 2>/dev/null || true)"
      [[ "$status" == 'running false' ]] || echo "$service: container unavailable/OOM" >>"$issues"
    done
    if ! dc exec -T backend node -e '
      fetch("http://127.0.0.1:4000/health/ready",{signal:AbortSignal.timeout(5000)})
        .then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1));' >/dev/null 2>&1; then
      echo 'API/storage: readiness failed' >>"$issues"
    fi
    if ! dc exec -T backend node -e '
      fetch("http://127.0.0.1:4000/health/bots",{signal:AbortSignal.timeout(20000)})
        .then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1));' >/dev/null 2>&1; then
      echo 'Bot: webhook/Telegram check failed' >>"$issues"
    fi
    available="$(df -Pk "$APP_DIR/data" | awk 'NR==2 {print $4}')"
    [[ "$available" =~ ^[0-9]+$ ]] || fail 'Cannot determine available disk space'
    if (( available < 1048576 )); then echo 'Disk: less than 1 GiB available' >>"$issues"; fi
    if [[ -f /proc/meminfo ]]; then
      memory="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
      if [[ "$memory" =~ ^[0-9]+$ ]] && (( memory < 65536 )); then echo 'Memory: less than 64 MiB available' >>"$issues"; fi
    fi
    if [[ -f "$APP_DIR/data/offsite/restic.env" ]]; then
      last=0
      [[ ! -f "$APP_DIR/data/offsite/last-success" ]] || last="$(date -d "$(cat "$APP_DIR/data/offsite/last-success")" +%s 2>/dev/null || echo 0)"
      if (( $(date +%s) - last > 1800 )); then echo 'Backup: no successful upload within 30 minutes' >>"$issues"; fi
      if [[ -f "$APP_DIR/data/offsite/last-attempt" && "$(awk '{print $2}' "$APP_DIR/data/offsite/last-attempt")" != 0 ]]; then
        echo 'Backup: last attempt failed' >>"$issues"
      fi
    fi
    sort -u "$issues" >"$ROOT/current.tmp"
    mv "$ROOT/current.tmp" "$ROOT/current"
    cat "$ROOT/current"
    if [[ -f "$ROOT/telegram.env" ]] && { [[ ! -f "$ROOT/notified" ]] || ! cmp -s "$ROOT/current" "$ROOT/notified"; }; then
      mapfile -t credentials <"$ROOT/telegram.env"
      token="${credentials[0]:-}"; chat="${credentials[1]:-}"
      [[ "$token" =~ ^[0-9]+:[a-zA-Z0-9_-]+$ && "$chat" =~ ^[1-9][0-9]*$ ]] || fail 'Invalid monitoring credentials'
      { echo 'Cargona monitoring'; if [[ -s "$ROOT/current" ]]; then cat "$ROOT/current"; else echo 'All configured checks recovered.'; fi; } >"$ROOT/message"
      # Token passed through curl stdin, not process arguments or logs.
      if printf 'url = "https://api.telegram.org/bot%s/sendMessage"\n' "$token" |
        curl --silent --fail --max-time 15 --config - --data-urlencode "chat_id=$chat" --data-urlencode "text@$ROOT/message" >/dev/null; then
        cp "$ROOT/current" "$ROOT/notified"
      else fail 'Monitoring notification failed; next run will retry'; fi
    fi
    [[ ! -s "$ROOT/current" ]]
    ;;
  enable)
    [[ "$APP_DIR" =~ ^/[a-zA-Z0-9_./-]+$ ]] || fail 'Requires a simple absolute Linux path'
    command -v systemctl >/dev/null || fail 'Для расписания нужен systemd. Разовая проверка: cargona monitor:run'
    cat >/etc/systemd/system/cargona-monitor.service <<EOF
[Unit]
Description=Cargona health and backup monitor
After=docker.service network-online.target
[Service]
Type=oneshot
ExecStart=/bin/bash $APP_DIR/monitor.sh run
UMask=0077
TimeoutStartSec=90s
EOF
    cat >/etc/systemd/system/cargona-monitor.timer <<'EOF'
[Unit]
Description=Cargona health check every 2 minutes
[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
AccuracySec=15s
[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable --now cargona-monitor.timer ;;
  disable)
    command -v systemctl >/dev/null || fail 'Для расписания нужен systemd'
    systemctl disable --now cargona-monitor.timer ;;
  status)
    if [[ -f "$ROOT/telegram.env" ]]; then echo 'Уведомления: настроены'; else echo 'Уведомления: не настроены'; fi
    if [[ -f "$ROOT/current" ]]; then
      if [[ -s "$ROOT/current" ]]; then cat "$ROOT/current"; else echo 'Последняя проверка: проблем не найдено'; fi
    else echo 'Проверка ещё не запускалась'; fi
    if command -v systemctl >/dev/null && systemctl is-active --quiet cargona-monitor.timer; then
      echo 'Расписание: включено (каждые 2 минуты)'
    else echo 'Расписание: выключено или systemd недоступен'; fi ;;
  *) fail 'Usage: monitor.sh configure|run|enable|disable|status' ;;
esac
