#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${1:-}" ]]; then
  echo 'Usage: cargona update <full Git commit SHA published in GHCR>' >&2
  exit 1
fi
exec bash "$APP_DIR/release.sh" update "$1"
