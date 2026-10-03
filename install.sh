#!/usr/bin/env bash
# Runtime-only installation. Explicit revision; no clone, build, or data replacement.
set -Eeuo pipefail
sha="${1:-}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Usage: bash install.sh <full release Git SHA> [empty absolute directory]' >&2; exit 1; }
helper="$(mktemp)"
trap 'rm -f -- "$helper"' EXIT
curl --fail --silent --show-error --location --proto '=https' "https://raw.githubusercontent.com/SkellyVA/cargona/$sha/bundle-install.sh" -o "$helper"
bash -n "$helper"
bash "$helper" "$sha" "${2:-/opt/cargona}"
