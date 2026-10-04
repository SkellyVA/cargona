#!/usr/bin/env bash
# Runtime-only installation. Menu or explicit revision; never clones sources.
set -Eeuo pipefail
sha="${1:-}"
selector=''
helper="$(mktemp)"
trap 'rm -f -- "$helper" "${selector:-}"' EXIT
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
