#!/usr/bin/env bash
# ==============================================================================
# CargonaOS — 1-Command Automated Production Installer & Setup Wizard
# One-liner: curl -fsSL https://raw.githubusercontent.com/SkellyVA/cargona/main/install.sh | bash
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

# Helper for reading interactive input even when piped via curl | bash
prompt_read() {
  local prompt_msg="$1"
  local var_name="$2"
  local default_val="$3"
  local is_secret="$4"

  if [ -t 0 ]; then
    if [ "$is_secret" = "true" ]; then
      echo -ne "${prompt_msg}"
      read -s val
      echo ""
    else
      read -p "${prompt_msg}" val
    fi
  else
    if [ "$is_secret" = "true" ]; then
      echo -ne "${prompt_msg}" > /dev/tty
      read -s val < /dev/tty
      echo "" > /dev/tty
    else
      read -p "${prompt_msg}" val < /dev/tty
    fi
  fi

  if [ -z "$val" ] && [ -n "$default_val" ]; then
    val="$default_val"
  fi
  eval "$var_name=\"\$val\""
}

clear 2>/dev/null || true

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

# 1. Root / Sudo Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[!] Рекомендуется запускать установщик с правами root или через sudo.${NC}\n"
fi

# 2. Setup Target Directory (/opt/cargona)
INSTALL_DIR="/opt/cargona"
echo -e "${CYAN}[1/5] Подготовка каталога установки (${INSTALL_DIR})...${NC}"

if [ ! -d "$INSTALL_DIR" ]; then
  mkdir -p "$INSTALL_DIR"
fi

# Ensure git is installed
if ! command -v git &> /dev/null; then
  echo -e "${YELLOW}--> Установка git...${NC}"
  if command -v apt-get &> /dev/null; then
    apt-get update -qq && apt-get install -y -qq git curl openssl
  elif command -v yum &> /dev/null; then
    yum install -y -q git curl openssl
  elif command -v apk &> /dev/null; then
    apk add --no-cache git curl openssl bash
  fi
fi

# Clone or pull repo into /opt/cargona
if [ ! -f "${INSTALL_DIR}/docker-compose.yml" ]; then
  echo -e "${CYAN}--> Загрузка дистрибутива CargonaOS...${NC}"
  if [ -d "${INSTALL_DIR}/.git" ]; then
    cd "$INSTALL_DIR" && git pull origin main || git pull
  else
    git clone https://github.com/SkellyVA/cargona.git "$INSTALL_DIR"
  fi
fi

cd "$INSTALL_DIR"

# 3. Check Docker & Docker Compose
echo -e "\n${CYAN}[2/5] Проверка Docker и Docker Compose...${NC}"
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
  prompt_read "Хотите установить Docker автоматически? (y/n) [y]: " INSTALL_DOCKER_CHOICE "y"
  if [[ "$INSTALL_DOCKER_CHOICE" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}--> Автоматическая установка Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || true
    echo -e "${GREEN}✓ Docker успешно установлен!${NC}"
  else
    echo -e "${RED}[X] Docker необходим для работы системы. Установка прервана.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Docker установлен.${NC}"
fi

# 4. Interactive Configuration Prompts
echo -e "\n${CYAN}[3/5] Настройка параметров платформы:${NC}"

# Domain
DEFAULT_DOMAIN="cargona.local"
if [ -n "$APP_DOMAIN" ]; then
  DEFAULT_DOMAIN="$APP_DOMAIN"
fi
prompt_read "$(echo -e "${BOLD}1. Домен системы${NC} (например: cargo.mysite.com) [${DEFAULT_DOMAIN}]: ")" INPUT_DOMAIN "$DEFAULT_DOMAIN"
APP_DOMAIN=$(echo "$INPUT_DOMAIN" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/$||')

# SuperAdmin Email
DEFAULT_EMAIL="admin@cargona.io"
prompt_read "$(echo -e "${BOLD}2. Email Супер-Администратора${NC} [${DEFAULT_EMAIL}]: ")" INPUT_EMAIL "$DEFAULT_EMAIL"
SUPERADMIN_EMAIL="$INPUT_EMAIL"

# SuperAdmin Name
DEFAULT_NAME="Администратор Платформы"
prompt_read "$(echo -e "${BOLD}3. Имя Супер-Администратора${NC} [${DEFAULT_NAME}]: ")" INPUT_NAME "$DEFAULT_NAME"
SUPERADMIN_NAME="$INPUT_NAME"

# SuperAdmin Password
while true; do
  prompt_read "$(echo -e "${BOLD}4. Пароль Супер-Администратора${NC} (ввод скрыт): ")" PASS1 "" "true"
  if [ -z "$PASS1" ]; then
    echo -e "${YELLOW}[!] Пароль не может быть пустым. Введите пароль.${NC}"
    continue
  fi
  if [ ${#PASS1} -lt 6 ]; then
    echo -e "${YELLOW}[!] Пароль должен содержать минимум 6 символов.${NC}"
    continue
  fi

  prompt_read "$(echo -e "${BOLD}   Подтвердите пароль${NC}: ")" PASS2 "" "true"

  if [ "$PASS1" != "$PASS2" ]; then
    echo -e "${RED}[!] Пароли не совпадают! Попробуйте снова.${NC}\n"
  else
    SUPERADMIN_PASSWORD="$PASS1"
    break
  fi
done

# Max Tenants License Limit
DEFAULT_LIMIT="0"
prompt_read "$(echo -e "${BOLD}5. Лимит организаций по лицензии${NC} (1 для одного клиента, 0 для безлимита) [${DEFAULT_LIMIT}]: ")" INPUT_LIMIT "$DEFAULT_LIMIT"
MAX_TENANTS_LIMIT="$INPUT_LIMIT"

# Generate Secrets
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 24)

# 5. Write .env File
echo -e "\n${CYAN}[4/5] Сохранение конфигурации в .env и регистрация CLI...${NC}"
cat > "${INSTALL_DIR}/.env" << EOF
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

chmod 600 "${INSTALL_DIR}/.env"

# Ensure data directories exist
mkdir -p "${INSTALL_DIR}/data/backend" "${INSTALL_DIR}/data/postgres" "${INSTALL_DIR}/data/caddy_data" "${INSTALL_DIR}/data/caddy_config" "${INSTALL_DIR}/data/backups"

# Register global CLI command: cargona
chmod +x "${INSTALL_DIR}/cargona" "${INSTALL_DIR}/update.sh" "${INSTALL_DIR}/install.sh"
ln -sf "${INSTALL_DIR}/cargona" /usr/local/bin/cargona 2>/dev/null || true
chmod +x /usr/local/bin/cargona 2>/dev/null || true
echo -e "${GREEN}✓ Глобальная консоль 'cargona' установлена в /usr/local/bin/cargona${NC}"

# Free up ports 80/443 on host if standalone web server is running
if command -v systemctl &> /dev/null; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${YELLOW}[!] Остановка локального Nginx для освобождения портов 80/443...${NC}"
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
  fi
  if systemctl is-active --quiet apache2 2>/dev/null; then
    echo -e "${YELLOW}[!] Остановка локального Apache2...${NC}"
    systemctl stop apache2 2>/dev/null || true
    systemctl disable apache2 2>/dev/null || true
  fi
fi

# 6. Launch Docker Stack
echo -e "\n${CYAN}[5/5] Сборка и запуск контейнеров с автоматическим SSL...${NC}"
if docker compose version &> /dev/null; then
  docker compose up -d --build
else
  docker-compose up -d --build
fi

# 7. Final Summary
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
echo -e "🛠️ ${BOLD}CLI Управление:${NC}          Команда 'cargona' доступна из любой папки"
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}✓ Система автоматически настроила HTTPS для вашего домена!${NC}"
echo -e "${YELLOW}Для управления системой просто наберите в консоли:${NC} ${BOLD}cargona${NC}\n"

