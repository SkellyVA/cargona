#!/usr/bin/env bash
set -eu
printf '%s ' "$@" >>"$MOCK_ROOT/log"
printf '\n' >>"$MOCK_ROOT/log"
if [[ "$1" == compose ]]; then
  shift
  images=''
  while [[ "${1:-}" == --project-directory || "${1:-}" == -f ]]; do
    if [[ "$1" == -f ]]; then images="$2"; fi
    shift 2
  done
  case "$1" in
    version) exit 0 ;;
    config)
      if [[ "${2:-}" == --format ]]; then printf '{"services":{"backend":{}}}\n';
      else printf 'services:\n  backend:\n    environment:\n      SECRET: fixture-secret\n'; fi
      exit 0 ;;
    ps)
      if [[ "$*" == *--services* ]]; then printf 'backend\nfrontend\nbot\ncaddy\n';
      else printf 'mock-%s\n' "${@: -1}"; fi
      exit 0 ;;
    stop|start) exit 0 ;;
    run)
      if [[ "$*" == *state-migration.mjs* ]]; then
        mount=''
        while [[ $# -gt 0 ]]; do
          if [[ "$1" == -v ]]; then mount="${2%:/snapshot}"; break; fi
          shift
        done
        cp "$MOCK_ROOT/data/backend/cargona-store.json" "$mount/state.json"
        exit 0
      fi
      [[ "${MOCK_CORRUPT:-}" != true ]]; exit $? ;;
    exec)
      if [[ "$*" == *pg_dump* ]]; then printf 'verified-postgres-fixture'; exit 0; fi
      if [[ "$*" == *pg_restore* ]]; then cat >/dev/null; exit 0; fi
      if [[ "$*" == *POSTGRES_DB* ]]; then printf 'fixture'; exit 0; fi
      if [[ "$*" == *POSTGRES_USER* ]]; then printf 'fixture'; exit 0; fi
      if [[ "${MOCK_UNHEALTHY:-}" == true && -f "$MOCK_ROOT/new" ]]; then exit 1; fi
      exit 0 ;;
    up)
      if [[ "$images" == *candidate.yml && "${@: -1}" == backend ]]; then
        [[ "${MOCK_FAIL_UP:-}" != true ]] || exit 1
        touch "$MOCK_ROOT/new"
        if [[ "${MOCK_NEW_DATA:-}" == true ]]; then printf '{"tenants":[],"customers":[],"packages":[],"users":[],"newRecord":true}\n' >"$MOCK_ROOT/data/backend/cargona-store.json"; fi
      elif [[ "${@: -1}" == backend ]]; then rm -f "$MOCK_ROOT/new"; fi
      exit 0 ;;
  esac
fi
if [[ "$1" == inspect ]]; then
  if [[ "$*" == *Config.Env* ]]; then printf 'STORAGE_BACKEND=%s\nDATABASE_URL=postgres://fixture:private@postgres:5432/fixture\n' "${MOCK_MODE:-json}";
  elif [[ "$*" == *Mounts* ]]; then printf '%s/data/backend\n' "$MOCK_ROOT";
  else printf 'sha256:%064d\n' 1; fi
  exit 0
fi
if [[ "$1" == pull ]]; then [[ "${MOCK_PULL_FAIL:-}" != true ]]; exit $?; fi
if [[ "$1" == image && "$2" == inspect ]]; then printf 'sha256:%064d\n' 1; exit 0; fi
if [[ "$1" == tag ]]; then exit 0; fi
if [[ "$1" == run ]]; then
  if [[ "$*" == *runtime-compatibility.json* ]]; then
    if [[ "$*" == *sha256:* || "$*" == *cargona-release-backend:* ]]; then [[ "${MOCK_OLD_COMPAT:-true}" == true ]];
    else [[ "${MOCK_TARGET_COMPAT:-true}" == true ]]; fi
    exit $?
  elif [[ "$*" == *'JSON.parse(input)'* ]]; then
    cat >/dev/null
    mode="${MOCK_CONFIG_MODE:-${MOCK_MODE:-json}}"
    printf '%s\n' "$mode"
    if [[ "$mode" == json ]]; then printf '%s/data/backend' "$MOCK_ROOT";
    else printf 'postgres://fixture:private@postgres:5432/fixture'; fi | sha256sum | cut -d' ' -f1
    exit 0
  elif [[ "$*" == *'new URL(input.trim())'* ]]; then cat >/dev/null; exit 0
  else [[ "${MOCK_CORRUPT:-}" != true ]]; exit $?; fi
fi
echo 'Unexpected mock Docker invocation' >&2
exit 99
