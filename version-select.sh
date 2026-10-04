#!/usr/bin/env bash
# Return a full SHA on stdout; UI goes to stderr, input to the controlling terminal.
set -Eeuo pipefail
umask 077
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
curl --fail --silent --show-error --location --connect-timeout 10 --max-time 30 \
  'https://api.github.com/repos/SkellyVA/cargona/actions/workflows/docker-publish.yml/runs?branch=main&status=success&per_page=30' \
  -o "$work/runs.json"
docker run --rm -i --network none --entrypoint node node:22-alpine -e '
  let input="";process.stdin.on("data",b=>input+=b).on("end",()=>{
    const seen=new Set();
    const runs=JSON.parse(input).workflow_runs;
    if(!Array.isArray(runs)) throw Error("Invalid GitHub response");
    for(const r of runs){
      if(r.status!=="completed"||r.conclusion!=="success"||r.head_branch!=="main"||
        !/^[a-f0-9]{40}$/.test(r.head_sha)||seen.has(r.head_sha)) continue;
      seen.add(r.head_sha);
      const title=String(r.display_title||"Версия").replace(/[\x00-\x1f\x7f-\x9f]/g," ").slice(0,80);
      const date=String(r.created_at||"").slice(0,10).replace(/[^0-9-]/g,"");
      console.log(r.head_sha+"\t"+date+"\t"+title);
      if(seen.size===10)break;
    }
  });' <"$work/runs.json" >"$work/versions"
mapfile -t versions <"$work/versions"
[[ ${#versions[@]} -gt 0 ]] || { echo 'Нет успешно опубликованных версий. Попробуйте позже или передайте SHA явно.' >&2; exit 1; }
printf '\nДоступные версии (сборка и публикация завершились успешно):\n' >&2
for i in "${!versions[@]}"; do
  IFS=$'\t' read -r sha date title <<<"${versions[i]}"
  label=''
  [[ "$i" != 0 ]] || label=' — последняя успешная'
  printf '%s) %s · %s · %s%s\n' "$((i+1))" "$date" "${sha:0:8}" "$title" "$label" >&2
done
printf 'm) Ввести SHA вручную\n0) Отмена\n' >&2
while true; do
  read -r -p 'Выберите версию [1]: ' choice </dev/tty
  choice="${choice:-1}"
  if [[ "$choice" == 0 ]]; then echo 'Отменено' >&2; exit 1; fi
  if [[ "$choice" == m ]]; then
    read -r -p 'Полный SHA опубликованной версии: ' sha </dev/tty
    [[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Нужны 40 символов SHA' >&2; continue; }
    printf '%s\n' "$sha"; exit
  fi
  if [[ "$choice" =~ ^[0-9]{1,2}$ ]] && ((10#$choice>=1 && 10#$choice<=${#versions[@]})); then
    printf '%s\n' "${versions[$((10#$choice-1))]%%$'\t'*}"; exit
  fi
  echo 'Неверный пункт' >&2
done
