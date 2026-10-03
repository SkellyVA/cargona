#!/usr/bin/env bash
# Downloads only runtime files from one immutable revision. Never clones a repo.
set -Eeuo pipefail
umask 077
sha="${1:-}"
target="${2:-/opt/cargona}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Usage: bundle-install.sh <full Git SHA> [empty absolute directory]' >&2; exit 1; }
[[ "$target" =~ ^/[a-zA-Z0-9_./-]+$ && "$target" != / && "$target" != *'/../'* && "$target" != */.. ]] || { echo 'Invalid target directory' >&2; exit 1; }
command -v curl >/dev/null
command -v openssl >/dev/null
command -v flock >/dev/null
docker compose version >/dev/null
mkdir -p "$target"
[[ -z "$(find "$target" -mindepth 1 -maxdepth 1 -print -quit)" ]] || { echo 'Installation directory must be empty. Existing installations are never overwritten.' >&2; exit 1; }
stage="$(mktemp -d "${target%/}.bundle-XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
base="https://raw.githubusercontent.com/SkellyVA/cargona/$sha"
for file in cargona release.sh update.sh offsite-backup.sh monitor.sh rehearse.sh maintenance.sh runtime-tools.sh Caddyfile init-db.sql; do
  curl --fail --silent --show-error --location --proto '=https' "$base/$file" -o "$stage/$file"
done
curl --fail --silent --show-error --location --proto '=https' "$base/docker-compose.runtime.yml" -o "$stage/docker-compose.yml"
for file in "$stage/"*.sh "$stage/cargona"; do bash -n "$file"; chmod 755 "$file"; done
read -r -p 'Domain (e.g. noor.example.com): ' domain </dev/tty
read -r -p 'Platform administrator email: ' email </dev/tty
[[ "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9]$ && "$email" =~ ^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+$ ]] || { echo 'Invalid domain/email' >&2; exit 1; }
# Hex secrets avoid dotenv, URL and Compose interpolation ambiguities.
admin="$(openssl rand -hex 24)"
printf 'CARGONA_VERSION=%s\nAPP_DOMAIN=%s\nSUPERADMIN_EMAIL=%s\nSUPERADMIN_PASSWORD=%s\nDB_PASSWORD=%s\nJWT_SECRET=%s\nSTORAGE_BACKEND=json\n' \
  "$sha" "$domain" "$email" "$admin" "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" >"$stage/.env"
docker compose --project-directory "$stage" -f "$stage/docker-compose.yml" config -q
cp -a "$stage/." "$target/"
chmod 700 "$target"
if [[ "$EUID" == 0 ]]; then ln -sfn "$target/cargona" /usr/local/bin/cargona; fi
echo 'Runtime bundle prepared. Administrator password is in the private .env file.'
echo "No services started. Next: cd $target && docker compose pull && docker compose up -d"
