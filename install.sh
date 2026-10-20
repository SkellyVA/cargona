#!/usr/bin/env bash
# Runtime-only installation. Menu or explicit revision; never clones sources.
set -Eeuo pipefail
sha="${1:-}"
selector=''
docker_setup=''
helper="$(mktemp)"
trap 'rm -f -- "$helper" "${selector:-}" "${docker_setup:-}"' EXIT
# Prepare Docker before the version selector uses a Node container.
if [[ -n "$sha" && ! "$sha" =~ ^[a-f0-9]{40}$ ]]; then
  echo 'Usage: bash install.sh [full release Git SHA] [empty absolute directory]' >&2
  exit 1
fi
for prerequisite in curl openssl flock; do
  command -v "$prerequisite" >/dev/null || { echo "Не найдена зависимость: $prerequisite. Установите её и повторите запуск." >&2; exit 1; }
done
if ! command -v docker >/dev/null; then
  [[ "$(uname -s)" == Linux ]] || { echo 'Автоустановка Docker поддерживается только на Linux. Установите Docker Engine и Compose v2 вручную.' >&2; exit 1; }
  [[ "$(id -u)" == 0 ]] || { echo 'Docker не установлен. Запустите установщик от root (sudo bash /tmp/cargona-install.sh) или установите Docker Engine и Compose v2: https://docs.docker.com/engine/install/' >&2; exit 1; }
  echo 'Docker не установлен. Устанавливаем Docker Engine и Compose из официального репозитория Docker…' >&2
  docker_setup="$(mktemp)"
  curl --fail --silent --show-error --location --proto '=https' \
    https://get.docker.com -o "$docker_setup"
  bash -n "$docker_setup"
  sh "$docker_setup" --channel stable >&2
  command -v docker >/dev/null || { echo 'Установка Docker не завершена. Проверьте вывод установщика Docker выше.' >&2; exit 1; }
fi
docker compose version >/dev/null 2>&1 || { echo 'Не найден Docker Compose v2. Установите плагин: https://docs.docker.com/compose/install/linux/' >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Docker установлен, но демон недоступен. Проверьте службу (sudo systemctl start docker) и права на Docker socket, затем повторите установку.' >&2; exit 1; }
if [[ -z "$sha" ]]; then
  selector="$(mktemp)"
  curl --fail --silent --show-error --location --proto '=https' \
    https://raw.githubusercontent.com/SkellyVA/cargona/main/version-select.sh -o "$selector"
  bash -n "$selector"
  sha="$(bash "$selector")"
fi
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Usage: bash install.sh [full release Git SHA] [empty absolute directory]' >&2; exit 1; }
printf 'Выбрана версия: %s\n' "$sha"
curl --fail --silent --show-error --location --proto '=https' "https://raw.githubusercontent.com/SkellyVA/cargona/$sha/bundle-install.sh" -o "$helper"
bash -n "$helper"
bash "$helper" "$sha" "${2:-/opt/cargona}"
