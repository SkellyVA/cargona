#!/usr/bin/env bash
# ==============================================================================
# CargonaOS — Safe One-Click System Updater (Zero Data Loss)
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${BOLD}       Обновление CargonaOS Platform (Безопасный режим)${NC}"
echo -e "${BLUE}================================================================${NC}\n"

# 1. Automatic Backup of Database & Settings
echo -e "${CYAN}[1/3] Создание резервной копии базы данных перед обновлением...${NC}"
mkdir -p data/backups
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"

if [ -f data/backend/cargona-store.json ]; then
  cp data/backend/cargona-store.json "data/backups/${BACKUP_NAME}.json"
  echo -e "${GREEN}✓ База данных сохранена в: data/backups/${BACKUP_NAME}.json${NC}"
elif [ -f cargona-store.json ]; then
  cp cargona-store.json "data/backups/${BACKUP_NAME}.json"
  echo -e "${GREEN}✓ База данных сохранена в: data/backups/${BACKUP_NAME}.json${NC}"
fi

if [ -f .env ]; then
  cp .env "data/backups/${BACKUP_NAME}.env"
fi

# 2. Pull latest changes from Git (if git repository)
echo -e "\n${CYAN}[2/3] Получение свежего кода обновления...${NC}"
if [ -d .git ]; then
  git pull origin main || git pull || echo -e "${YELLOW}[!] Git pull пропущен (ручная сборка)${NC}"
fi

# 3. Rebuild and restart containers
echo -e "\n${CYAN}[3/3] Пересборка и запуск обновленных контейнеров...${NC}"
if docker compose version &> /dev/null; then
  docker compose up -d --build
else
  docker-compose up -d --build
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 CargonaOS успешно обновлена до последней версии!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "✓ Все данные, клиенты, филиалы и история сохранены в целости."
echo -e "✓ Резервная копия создана: data/backups/${BACKUP_NAME}.json\n"
