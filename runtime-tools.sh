#!/usr/bin/env bash
# Update operator scripts only, never storage or services; retain previous files.
set -Eeuo pipefail
umask 077
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sha="${1:-}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Usage: runtime-tools.sh <full Git SHA>' >&2; exit 1; }
mkdir -p "$APP_DIR/data/releases" "$APP_DIR/data/tools"
exec 9>"$APP_DIR/data/releases/.lock"
flock -n 9 || { echo 'Another release operation is running' >&2; exit 1; }
stage="$(mktemp -d "$APP_DIR/data/tools/download-XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
files=(cargona release.sh update.sh offsite-backup.sh monitor.sh rehearse.sh maintenance.sh postgres-migrate.sh version-select.sh runtime-tools.sh)
for file in "${files[@]}"; do
  curl --fail --silent --show-error --location --proto '=https' "https://raw.githubusercontent.com/SkellyVA/cargona/$sha/$file" -o "$stage/$file"
  bash -n "$stage/$file"
  chmod 755 "$stage/$file"
done
previous="$(mktemp -d "$APP_DIR/data/tools/previous-XXXXXX")"
for file in "${files[@]}"; do [[ ! -f "$APP_DIR/$file" ]] || cp -p "$APP_DIR/$file" "$previous/$file"; done
for file in "${files[@]}"; do
  cp "$stage/$file" "$APP_DIR/.$file.next"
  chmod 755 "$APP_DIR/.$file.next"
  mv "$APP_DIR/.$file.next" "$APP_DIR/$file"
done
printf '%s\n' "$sha" >"$APP_DIR/data/tools/version"
echo "Operator tools updated. Previous scripts: $previous. Application and database unchanged."
