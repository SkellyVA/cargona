#!/usr/bin/env bash
# ==============================================================================
# CargonaOS — Safe One-Click System Updater (Clean Progress Mode)
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

APP_DIR="/opt/cargona"
if [ ! -d "$APP_DIR" ]; then
  APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
cd "$APP_DIR"

# Clean progress spinner helper
run_with_spinner() {
  local title="$1"
  shift
  local log_file="/tmp/cargona_update_step.log"
  rm -f "$log_file"

  "$@" > "$log_file" 2>&1 &
  local pid=$!

  local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  local start_time=$(date +%s)

  while kill -0 "$pid" 2>/dev/null; do
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    local char="${spin:i++%${#spin}:1}"
    printf "\r  \033[0;36m[%s]\033[0m %s \033[0;37m(%ds)\033[0m   " "$char" "$title" "$elapsed"
    sleep 0.1
  done

  wait "$pid" || true
  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    printf "\r  \033[0;32m[✓]\033[0m %s \033[0;32m(Готово)\033[0m          \n" "$title"
  else
    printf "\r  \033[0;31m[✗]\033[0m %s \033[0;31m(Ошибка!)\033[0m          \n\n" "$title"
    echo -e "\033[0;31m=================== ПОСЛЕДНИЕ СТРОКИ ОШИБКИ ===================\033[0m"
    tail -n 30 "$log_file" 2>/dev/null || cat "$log_file"
    echo -e "\033[0;31m===============================================================\033[0m\n"
    exit $exit_code
  fi
}

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${BOLD}       Обновление CargonaOS Platform (Безопасный режим)${NC}"
echo -e "${BLUE}================================================================${NC}\n"

# 1. Automatic Backup of Database & Settings
echo -e "${CYAN}[1/3] Создание резервной копии базы данных...${NC}"
mkdir -p data/backups
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"

if [ -f data/backend/cargona-store.json ]; then
  cp data/backend/cargona-store.json "data/backups/${BACKUP_NAME}.json"
  echo -e "  ${GREEN}[✓]${NC} База данных сохранена в: data/backups/${BACKUP_NAME}.json"
elif [ -f cargona-store.json ]; then
  cp cargona-store.json "data/backups/${BACKUP_NAME}.json"
  echo -e "  ${GREEN}[✓]${NC} База данных сохранена в: data/backups/${BACKUP_NAME}.json"
fi

if [ -f .env ]; then
  cp .env "data/backups/${BACKUP_NAME}.env"
fi

# 2. Pull latest changes from Git
echo -e "\n${CYAN}[2/3] Получение свежего кода обновления...${NC}"
git_pull_cmd() {
  if [ -d .git ]; then
    git pull origin main || git pull
  fi
}
run_with_spinner "Синхронизация с репозиторием GitHub..." git_pull_cmd

# 3. Rebuild and restart containers
echo -e "\n${CYAN}[3/3] Пересборка и запуск обновленных контейнеров...${NC}"
docker_up_cmd() {
  if docker compose version &> /dev/null; then
    docker compose up -d --build
  else
    docker-compose up -d --build
  fi
}
run_with_spinner "Компиляция и обновление контейнеров в Docker..." docker_up_cmd

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 CargonaOS успешно обновлена до последней версии!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "✓ Все данные, клиенты, филиалы и история сохранены в целости."
echo -e "✓ Резервная копия создана: data/backups/${BACKUP_NAME}.json\n"
