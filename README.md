# CargonaOS

Платформа для карго-компаний: клиенты и посылки, склады и ПВЗ, WMS, рейсы,
финансовый журнал, Telegram-бот и MiniApp. Доступ сотрудников ограничивается
их ролью и компанией.

## Установка без исходников

Production использует готовые Docker-образы. На сервере не нужны Git, Node.js,
pnpm или сборка. Нужны Linux, Docker с Compose v2, Bash, curl, openssl,
util-linux (`flock`) и coreutils. Для внешних копий нужен Restic, для расписаний
бэкапов и мониторинга — systemd. Установщик не устанавливает эти зависимости.

Выберите полный SHA коммита из 40 символов с успешным
[Build and Publish Docker Images](https://github.com/SkellyVA/cargona/actions).
Все три образа версии должны быть опубликованы в GHCR. Ниже — проверенная версия
с интерактивным меню и миграцией PostgreSQL:

```bash
VERSION=2f1f4e02db73ddb2296012d1ba20a428c160545b
curl -fsSL "https://raw.githubusercontent.com/SkellyVA/cargona/$VERSION/install.sh" \
  -o /tmp/cargona-install.sh
bash /tmp/cargona-install.sh "$VERSION" /opt/cargona

cd /opt/cargona
docker compose pull
docker compose up -d
cargona status
```

Каталог установки должен быть **пустым**. Установщик спрашивает домен и email,
создаёт случайные пароли администратора и PostgreSQL, JWT-секрет и закрытый `.env`.
Сохраните пароль администратора из `.env` в менеджере паролей. Не публикуйте файл.
Установщик подготавливает файлы, но самостоятельно не запускает контейнеры.
Для HTTPS домен должен указывать на сервер, порты 80/443 должны быть доступны
и свободны. Для закрытых образов заранее выполните `docker login ghcr.io`.

На сервере остаются:

```text
/opt/cargona/
├── docker-compose.yml
├── .env
├── Caddyfile
├── init-db.sql
├── cargona
├── release.sh
├── update.sh
├── runtime-tools.sh
├── maintenance.sh
├── postgres-migrate.sh
├── offsite-backup.sh
├── monitor.sh
├── rehearse.sh
└── data/                    # данные, сертификаты, копии и отчёты
```

### Переход существующей установки

Не запускайте установщик поверх рабочего каталога. Сначала сохраните проверенную
копию, замените сборки `build:` готовыми образами и проверьте запуск, сохранив
имя Compose-проекта, mounts и настройки. После этого можно удалить исходники.
`.env`, `data/`, конфиги и скрипты обслуживания остаются.

Если Compose сохранён через `docker compose config`, он может содержать фиксированные
настройки вместо ссылок на `.env`. Для такого случая есть `compose-env-repair.sh`:
он сохраняет исходные файлы, возвращает ссылки, проверяет равенство итоговой
конфигурации и не перезапускает контейнеры. Отсутствующий `STORAGE_BACKEND`
явно задаётся как `json`.

```bash
cd /opt/cargona
VERSION=2f1f4e02db73ddb2296012d1ba20a428c160545b
curl -fsSL "https://raw.githubusercontent.com/SkellyVA/cargona/$VERSION/compose-env-repair.sh" \
  -o compose-env-repair.sh
chmod 700 compose-env-repair.sh
bash /opt/cargona/compose-env-repair.sh
```

При конфликтующих настройках или нестандартном подключении PostgreSQL скрипт
откажется заменять файлы. Подробности: [работа без репозитория](docs/runtime-operations.md).

## Интерактивное меню

Запустите `cargona` из любой папки сервера. `cargona help` показывает прямые команды.

| Пункт | Действие |
| --- | --- |
| 1 | Статус системы и контейнеров |
| 2 | Email и пароль супер-админа либо владельца компании |
| 3 | Лимит организаций |
| 4 | Проверенная локальная резервная копия |
| 5 | Восстановление JSON-базы из копии |
| 6 | Обновление приложения до указанного SHA |
| 7 | Перезапуск сервисов |
| 8 | Смена домена и настройки Caddy |
| 9 | NOOR CLUB и программа лояльности |
| 10 | Импорт данных компании из MongoDB или JSON |
| 11 | Логи всех сервисов либо выбранного сервиса |
| 12 | Список точек восстановления и откат приложения |
| 13 | Обновление CLI и скриптов по SHA |
| 14 | Внешние копии: настройка, расписание, список, проверка, скачивание, очистка |
| 15 | Мониторинг: настройка, проверка, расписание и статус |
| 16 | Пробное восстановление в изолированных контейнерах |
| 17 | JSON → PostgreSQL: режим, проверка, пробная транзакция, репетиция, применение |
| 18 | Полная справка |
| 0 | Выход |

## Команды CLI

`SHA` — полный хеш опубликованного коммита. `ID` — идентификатор из соответствующего
списка копий. Аргументы ниже заменяйте своими значениями.

| Команда | Действие |
| --- | --- |
| `cargona status` | Статус контейнеров и настроек |
| `cargona help` | Справка; также `--help`, `-h` |
| `cargona logs [service]` | Логи; например `backend`, `frontend`, `bot`, `postgres` |
| `cargona restart` | Перезапуск сервисов |
| `cargona admin:reset` | Интерактивная смена email/пароля супер-админа или владельца |
| `cargona limit [N]` | Лимит организаций; `0` — без ограничения |
| `cargona domain [domain]` | Смена домена; требуется настроенный сервис Caddy |
| `cargona loyalty` | Настройки программы лояльности |
| `cargona update SHA` | Обновление образов; без аргумента запросит SHA |
| `cargona tools:update SHA` | Обновление CLI и скриптов, сохранение предыдущего набора |
| `cargona rollback:list` | Список локальных точек восстановления |
| `cargona rollback ID` | Возврат образов приложения с сохранением актуальной базы |
| `cargona backup` | Проверенная локальная копия с краткой остановкой сервисов |
| `cargona backup:restore` | Восстановление JSON; заменяет текущие данные |
| `cargona offsite:configure` | Настройка Backblaze B2 и пароля шифрования |
| `cargona offsite:init` | Инициализация внешнего репозитория |
| `cargona offsite:run` | Внешняя копия сейчас |
| `cargona offsite:enable` | Расписание каждые 15 минут |
| `cargona offsite:disable` | Отключение расписания |
| `cargona offsite:status` | Состояние расписания и последних запусков |
| `cargona offsite:list` | Список внешних копий |
| `cargona offsite:check` | Проверка целостности с чтением данных |
| `cargona offsite:prune` | Удаление старых копий по правилам хранения |
| `cargona offsite:restore ID` | Скачивание копии в отдельный каталог |
| `cargona monitor:configure` | Настройка отдельного Telegram-бота и личного чата |
| `cargona monitor:run` | Проверка системы сейчас |
| `cargona monitor:enable` | Проверки каждые две минуты |
| `cargona monitor:disable` | Отключение расписания |
| `cargona monitor:status` | Состояние мониторинга |
| `cargona rehearse DIR IMAGE` | Изолированная проверка восстановления и перезапуска API |
| `cargona migration:status` | Текущий режим хранения |
| `cargona migration:inspect` | Проверка копии рабочего JSON |
| `cargona migration:trial` | Пробная транзакция PostgreSQL с откатом |
| `cargona migration:rehearse` | Изолированная репетиция миграции |
| `cargona migration:apply` | Подтверждённый перенос и переключение API |
| `cargona import [flags]` | Импорт данных компании из MongoDB или JSON |

Алиасы: `admin:password` → `admin:reset`, `license:limit` → `limit`,
`club` → `loyalty`, `backup:create` → `backup`.

### Обновление старой версии CLI

Если установленный `runtime-tools.sh` ещё не знает о новых файлах, сначала обновите
его в **рабочем каталоге**, а затем запустите:

```bash
cd /opt/cargona
VERSION=2f1f4e02db73ddb2296012d1ba20a428c160545b
curl -fsSL "https://raw.githubusercontent.com/SkellyVA/cargona/$VERSION/runtime-tools.sh" \
  -o runtime-tools.sh
chmod 755 runtime-tools.sh
bash /opt/cargona/runtime-tools.sh "$VERSION"
```

Скрипты обслуживания определяют рабочий каталог по своему расположению: не запускайте
`runtime-tools.sh` или скрипты обслуживания из `/tmp`. Это ограничение не относится
к загрузочному `install.sh`, которому каталог установки передаётся явно.

## Обновление и откат приложения

```bash
cargona update SHA
cargona status
cargona rollback:list
cargona rollback RELEASE_ID
```

Перед обновлением скачиваются образы, проверяется совместимость и создаётся
проверенная копия. На время копирования и запуска сервисы останавливаются.
Доступ открывается после успешной проверки API. Версия закрепляется по image ID
в `data/releases/active.yml`. База автоматически не мигрирует.

Откат возвращает совместимые образы, **сохраняя актуальную базу**. Он не заменяет её
старым снимком. Для исторических образов без декларации совместимости автоматический
откат может быть недоступен. Не удаляйте нужные образы и точки восстановления.
Подробности: [обновление и откат](docs/safe-updates.md).

При ручной работе с Compose учитывайте активные образы:

```bash
cd /opt/cargona
dc() {
  if [ -f data/releases/active.yml ]; then
    docker compose -f docker-compose.yml -f data/releases/active.yml "$@"
  else
    docker compose -f docker-compose.yml "$@"
  fi
}
dc ps
dc logs -f backend
```

Production не требует `docker compose up --build`. Обновление выполняйте через CLI.

## Миграция JSON → PostgreSQL

По умолчанию `STORAGE_BACKEND=json`. Наличие PostgreSQL-контейнера или
`DATABASE_URL` само по себе не переключает хранилище.

Откройте пункт **17** меню или выполните:

```bash
cargona migration:status
cargona migration:inspect
cargona migration:trial
cargona migration:rehearse
# Только в окно обслуживания, после изучения результатов:
cargona migration:apply
```

`trial` откатывает пробную транзакцию. `rehearse` проверяет перенос, обратный экспорт
и перезапуск API в отдельной Docker-сети. `apply` требует ввода `MIGRATE`, создаёт
бэкап, выполняет репетицию, останавливает запись, снимает свежий JSON и переносит
его в пустое целевое хранилище. Полный экспорт сверяется по SHA-256; API проверяется
до и после перезапуска, затем возвращается доступ.

Перенос сохраняет весь документ в JSONB, включая ID, суммы, даты, историю и
неизвестные поля. Это пока одна строка состояния и один процесс API, а не
нормализованные таблицы для всех сущностей. Исходный JSON сохраняется, но после
переключения больше не обновляется. Существующее состояние PostgreSQL не заменяется.
CLI поддерживает локальную Compose PostgreSQL; внешняя БД требует отдельной процедуры.
Нужен Compose со ссылкой `${STORAGE_BACKEND}` на `.env`; для старого сохранённого
конфига сначала выполните исправление из раздела перехода существующей установки.

**После новых записей в PostgreSQL нельзя просто вернуть старый JSON:** сначала
нужен экспорт актуального состояния при остановленной записи. При ошибке после
запуска PostgreSQL API миграция оставляет сервисы остановленными, чтобы не потерять
возможные новые данные. Подробности: [миграция и восстановление](docs/postgres-migration.md).

## Резервные копии и мониторинг

Локальные проверенные копии находятся в `data/releases/release-*`.
`backup:restore` предназначен для JSON и заменяет текущие данные; это отдельная
операция от отката образов. Копии на том же диске не защищают от потери сервера.

Для зашифрованных внешних копий:

```bash
cargona offsite:configure
cargona offsite:init
cargona offsite:run
cargona offsite:enable
cargona offsite:status
```

Храните пароль шифрования отдельно от сервера. Копии содержат состояние и настройки,
но не Docker-образы. `offsite:restore` скачивает данные отдельно, не заменяя рабочую
базу. Проверку восстановления выполняйте через `rehearse`.
Подробности и правила хранения: [внешние бэкапы](docs/offsite-backups.md).

```bash
cargona monitor:configure
cargona monitor:run
cargona monitor:enable
cargona monitor:status
```

Мониторинг проверяет API и хранилище, webhooks Telegram, очереди, контейнеры,
OOM, свободные память и диск, свежесть и ошибки внешних копий. Уведомления отправляются
в личный чат при изменении состояния. Для обнаружения полного отключения сервера
нужен отдельный внешний uptime-monitor. Бэкапы и мониторинг не включаются
автоматически при обновлении. Реальные RPO/RTO требуют репетиции на объёме вашей базы.

## Импорт данных компании

Импорт из MongoDB/JSON в компанию и переключение хранилища JSON → PostgreSQL
— разные операции.

```bash
cargona import --dir /absolute/path/to/dumps --tenant noor --dry-run
cargona import --dir /absolute/path/to/dumps --tenant noor
cargona import --mongo 'mongodb://HOST/DATABASE' --tenant noor --dry-run
```

Флаги: `--dir` — каталог JSON, `--mongo` — URI MongoDB, `--tenant` — slug компании,
`--dry-run` — проверка без сохранения данных, `--wipe` — очистка прежних данных
компании перед импортом. CLI создаёт копию и останавливает API на время отдельного
процесса импорта. URI с паролем может попасть в историю shell и список процессов.

## Данные и проверки

Рабочие данные находятся в `data/backend` для JSON и `data/postgres` для PostgreSQL;
сертификаты Caddy — в `data/caddy_data` и `data/caddy_config`. Не удаляйте `data/`,
`.env`, mounts или нужные Docker-тома при обновлении. Файлы состояния, конфиги,
бэкапы и отчёты могут содержать персональные данные и секреты.

CI проверяет сборки и регрессии, PostgreSQL 16, реальное восстановление контейнеров,
миграцию JSON → PostgreSQL и перезапуск API до публикации образов. Это проверки
на синтетических данных; они не заменяют репетицию восстановления вашей базы.
Для разработки исходники остаются в репозитории. Общая локальная проверка:

```bash
node scripts/check-all.mjs --build
```

Отчёт о предыдущем комплексном аудите: [nightly-audit-2026-10-04.md](docs/nightly-audit-2026-10-04.md).
