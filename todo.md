# CargonaOS — TODO & Статус

## ✅ Сделано

### Бэкенд (`apps/api/src/store.ts`)

- [x] Удалены все seed-тенанты (`Cargona Express`, `NOOR Express`)
- [x] Удалены seed-юзеры (`Рустам Баротов`, `Зарина Каримова`) — остался только `SUPER_ADMIN`
- [x] Удалены seed-склады/ПВЗ (`branch-mir-origin`, `branch-mir-pvz-1`, `branch-mir-pvz-2`)
- [x] Удалены seed-ячейки (`cell-1..3`)
- [x] Удалены seed-клиенты (`Фарух Рахимов`, `Али Джонзода`)
- [x] Удалены seed-посылки (`pkg-1..3`)
- [x] Удалены seed-рейсы (`trip-auto-14`)
- [x] Удалены seed-аудит записи
- [x] Удалены seed-ботконфиги (`bot-cargona` с mock-токеном)
- [x] Исправлен `loadFromFile()` — теперь принимает пустые массивы с диска (раньше `data.xxx.length` мешал)
- [x] При создании тенанта (`POST /api/admin/tenants`) — автоматически создаётся `TENANT_OWNER`

### Бэкенд — деплой на VPS

- [x] Бэкенд собран и задеплоен
- [x] Persistent store (`cargona-store.json`) удалён — при старте создаётся чистый
- [x] Контейнер `cargona_api` пересобран и запущен

---

## 🔄 В процессе

### Фронтенд (`apps/web/src/stores/useCargoStore.ts`)

- [ ] **Субагент работает** — чистит seed-данные из Pinia store (1714 строк):
  - `currentUser` дефолт → пустые значения
  - `settings.companyName` → `''` вместо `'Cargona Express'`
  - `settings.codePrefix` → `''` вместо `'CRG'`
  - `settings.chinaWarehouseAddress` → `''`
  - `tenants` дефолтный массив → `[]`
  - `rawBranches`, `rawStaff`, `rawCustomers`, `rawTrips`, `rawPackages`, `rawAuditLogs`, `rawOriginWarehouses` → `[]`

---

## ❌ Ещё нужно сделать

### 1. Фронтенд — дочистить и задеплоить

- [ ] Дождаться результата субагента по очистке `useCargoStore.ts`
- [ ] Собрать фронтенд (`pnpm --filter @cargona/web build`)
- [ ] Задеплоить на VPS (`scp` + `docker compose build frontend`)

### 2. Бот — название компании

- [ ] Сейчас бот использует `tenant.name` при ответе на `/start` — **это правильно**
- [ ] Но после сброса store — старые тенанты удалены, нужно создать нового через UI
- [ ] Убедиться: когда пользователь создаёт организацию в панели Cargona → настраивает бот-токен → бот использует **то самое название** из организации, а не захардкоженное

### 3. Панель Cargona — управление организацией

- [ ] Проверить что можно **удалить** организацию из панели (есть `DELETE /api/admin/tenants/:id`)
- [ ] Проверить что можно **изменить** название организации (есть `PUT /api/admin/tenants/:id`)
- [ ] Проверить что UI для этого работает (кнопки удаления/редактирования в AdminView или SettingsView)

### 4. Фронтенд — localStorage

- [ ] После очистки seed-данных, **у существующих юзеров** в localStorage останутся старые данные
- [ ] Нужно или: (а) добавить версионирование localStorage, или (б) просить юзеров очистить кэш
- [ ] Или добавить кнопку «Сбросить данные» в настройках

### 5. Бот — flow после сброса

- [ ] После сброса store на VPS — вебхук бота слетел (тенант удалён)
- [ ] Юзеру нужно: создать организацию → вставить бот-токен → сохранить → бот заработает
- [ ] Проверить что flow работает end-to-end

### 6. Оставшиеся упоминания «MIR» / «Cargona Express»

- [ ] `grep -r "MIR" apps/` — проверить что нет остаточных упоминаний
- [ ] `grep -r "Cargona Express" apps/` — аналогично
- [ ] `grep -r "mircargo" apps/` — аналогично

---

## 📋 Архитектурные заметки

| Компонент        | Где                                                           | Порт |
| ---------------- | ------------------------------------------------------------- | ---- |
| API (backend)    | `cargona_api` container                                       | 4000 |
| Frontend (nginx) | `cargona_web` container                                       | 8080 |
| Postgres         | `cargona_postgres` container                                  | 5432 |
| Bot daemon       | `cargona_bot` container                                       | —    |
| VPS              | `root@177.3.213.102`                                          | —    |
| Домен            | `cargona.akii.world`                                          | 443  |
| Persistent store | `/app/data/cargona-store.json` (docker volume `cargona_data`) | —    |

### Как работает бот

1. Юзер создаёт организацию → получает slug (напр. `my-cargo`)
2. В настройках вставляет Telegram Bot Token
3. Бэкенд: `POST /api/o/:slug/bot-settings` → сохраняет `botConfig` → ставит webhook на `https://cargona.akii.world/api/bot/webhook/:slug`
4. При `/start` → бэкенд находит tenant по slug → отвечает: `«${tenant.name}»`
5. **Название компании = `tenant.name`** — берётся из того что юзер ввёл при создании организации
