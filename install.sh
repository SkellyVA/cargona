#!/usr/bin/env bash
# ==============================================================================
# CargonaOS — Automated Production Installer & Setup Wizard
# ==============================================================================

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}${BOLD}"
cat << "EOF"
   ______                                        ____  _____
  / ____/___ _____________ _____  ____  ____ _   / __ \/ ___/
 / /   / __ `/ ___/ __  // __ \/ __ \/ __ `/  / / / /\__ \ 
/ /___/ /_/ / /  / /_/ // /_/ / / / / /_/ /  / /_/ /___/ / 
\____/\__,_/_/   \__, / \____/_/ /_/\__,_/   \____//____/  
                /____/                                     
              Enterprise Cargo Management System
EOF
echo -e "${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "${BOLD}       Добро пожаловать в мастер установки CargonaOS!${NC}"
echo -e "${BLUE}================================================================${NC}\n"

# 1. Check Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[!] Рекомендуется запускать установщик с правами root или через sudo.${NC}\n"
fi

# 2. Check Docker & Docker Compose
echo -e "${CYAN}[1/4] Проверка системных зависимостей...${NC}"
HAS_DOCKER=false
HAS_COMPOSE=false

if command -v docker &> /dev/null; then
  HAS_DOCKER=true
fi

if docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
  HAS_COMPOSE=true
fi

if [ "$HAS_DOCKER" = false ]; then
  echo -e "${YELLOW}[!] Docker не обнаружен на сервере.${NC}"
  read -p "Хотите установить Docker автоматически? (y/n) [y]: " INSTALL_DOCKER_CHOICE
  INSTALL_DOCKER_CHOICE=${INSTALL_DOCKER_CHOICE:-y}
  if [[ "$INSTALL_DOCKER_CHOICE" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}--> Установка Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}--> Docker успешно установлен!${NC}"
  else
    echo -e "${RED}[X] Docker необходим для работы системы. Установка прервана.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Docker установлен.${NC}"
fi

# 3. Interactive Configuration Prompts
echo -e "\n${CYAN}[2/4] Настройка конфигурации платформы:${NC}"

# Domain
DEFAULT_DOMAIN="cargona.local"
if [ -n "$APP_DOMAIN" ]; then
  DEFAULT_DOMAIN="$APP_DOMAIN"
fi
read -p "$(echo -e "${BOLD}1. Домен системы${NC} (например: cargo.mysite.com) [${DEFAULT_DOMAIN}]: ")" INPUT_DOMAIN
APP_DOMAIN=${INPUT_DOMAIN:-$DEFAULT_DOMAIN}
APP_DOMAIN=$(echo "$APP_DOMAIN" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/$||')

# SuperAdmin Email
DEFAULT_EMAIL="admin@cargona.io"
read -p "$(echo -e "${BOLD}2. Email Супер-Администратора${NC} [${DEFAULT_EMAIL}]: ")" INPUT_EMAIL
SUPERADMIN_EMAIL=${INPUT_EMAIL:-$DEFAULT_EMAIL}

# SuperAdmin Name
DEFAULT_NAME="Администратор Платформы"
read -p "$(echo -e "${BOLD}3. Имя Супер-Администратора${NC} [${DEFAULT_NAME}]: ")" INPUT_NAME
SUPERADMIN_NAME=${INPUT_NAME:-$DEFAULT_NAME}

# SuperAdmin Password (with confirmation and masking)
while true; do
  echo -ne "${BOLD}4. Пароль Супер-Администратора${NC} (ввод скрыт): "
  read -s PASS1
  echo ""
  if [ -z "$PASS1" ]; then
    echo -e "${YELLOW}[!] Пароль не может быть пустым. Пожалуйста, введите пароль.${NC}"
    continue
  fi
  if [ ${#PASS1} -lt 6 ]; then
    echo -e "${YELLOW}[!] Пароль должен содержать минимум 6 символов.${NC}"
    continue
  fi

  echo -ne "${BOLD}   Подтвердите пароль${NC}: "
  read -s PASS2
  echo ""

  if [ "$PASS1" != "$PASS2" ]; then
    echo -e "${RED}[!] Пароли не совпадают! Попробуйте снова.${NC}\n"
  else
    SUPERADMIN_PASSWORD="$PASS1"
    break
  fi
done

# 5. Max Tenants License Limit
DEFAULT_LIMIT="0"
read -p "$(echo -e "${BOLD}5. Лимит организаций по лицензии${NC} (1 для одного клиента, 0 для безлимита) [${DEFAULT_LIMIT}]: ")" INPUT_LIMIT
MAX_TENANTS_LIMIT=${INPUT_LIMIT:-$DEFAULT_LIMIT}

# Generate Secrets
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 24)

# 4. Write .env File
echo -e "\n${CYAN}[3/4] Сохранение переменных окружения в .env...${NC}"
cat > .env << EOF
# ==============================================================================
# CargonaOS Platform Environment Configuration
# Generated on: $(date)
# ==============================================================================

# Application Domain & Host
APP_DOMAIN=${APP_DOMAIN}
PORT=4000
HOST=0.0.0.0

# SuperAdmin Credentials
SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL}
SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD}
SUPERADMIN_NAME=${SUPERADMIN_NAME}

# Licensing Limits (0 = Unlimited, 1 = Dedicated Single-Tenant, N = Custom)
MAX_TENANTS_LIMIT=${MAX_TENANTS_LIMIT}

# Security & Secrets
JWT_SECRET=${JWT_SECRET}

# Database
DB_USER=cargona
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=cargona_db

# Persistence Directory
DATA_DIR=/app/data
EOF

chmod 600 .env
echo -e "${GREEN}✓ Файл .env успешно создан.${NC}"

# Ensure data directories exist
mkdir -p data/backend data/postgres data/caddy_data data/caddy_config

# Free up ports 80/443 on host if standalone web server is running
if command -v systemctl &> /dev/null; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${YELLOW}[!] Остановка локального Nginx на хосте для освобождения портов 80/443...${NC}"
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
  fi
  if systemctl is-active --quiet apache2 2>/dev/null; then
    echo -e "${YELLOW}[!] Остановка локального Apache2 на хосте...${NC}"
    systemctl stop apache2 2>/dev/null || true
    systemctl disable apache2 2>/dev/null || true
  fi
fi

# 5. Launch Docker Stack
echo -e "\n${CYAN}[4/4] Сборка и запуск контейнеров с автоматическим SSL...${NC}"
if docker compose version &> /dev/null; then
  docker compose up -d --build
else
  docker-compose up -d --build
fi

# 6. Final Summary
echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 CargonaOS успешно развернута и готова к работе!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "🌐 ${BOLD}Адрес системы:${NC}           https://${APP_DOMAIN}"
echo -e "🔒 ${BOLD}SSL-сертификат:${NC}          Автоматический (Let's Encrypt / ZeroSSL)"
echo -e "👑 ${BOLD}Панель Супер-Админа:${NC}     https://${APP_DOMAIN}/admin"
echo -e "📧 ${BOLD}Email Супер-Админа:${NC}      ${SUPERADMIN_EMAIL}"
echo -e "🔑 ${BOLD}Пароль:${NC}                  ${SUPERADMIN_PASSWORD}"
if [ "$MAX_TENANTS_LIMIT" -gt 0 ] 2>/dev/null; then
  echo -e "🏢 ${BOLD}Лимит организаций:${NC}      ${MAX_TENANTS_LIMIT} (Лицензия: макс. ${MAX_TENANTS_LIMIT})"
else
  echo -e "🏢 ${BOLD}Лимит организаций:${NC}      Безлимит (SaaS Platform)"
fi
echo -e "🤖 ${BOLD}Telegram Bot Webhook:${NC}    https://${APP_DOMAIN}/api/bot/webhook/:slug"
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}✓ Система автоматически настроила HTTPS-сертификат для вашего домена!${NC}"
echo -e "${YELLOW}Сохраните данные супер-администратора в надежном месте!${NC}\n"
