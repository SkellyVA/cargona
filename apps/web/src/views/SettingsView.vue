<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка настроек -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ t('settings.title') }}</h1>
        <p class="text-xs text-text-tertiary mt-0.5">{{ t('settings.subtitle') }}</p>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        <LanguageSwitcher />
        <button
          @click="showAddStaffModal = true"
          class="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition cursor-pointer whitespace-nowrap"
        >
          <UserPlus class="w-4 h-4" />
          <span>{{ t('settings.addStaffBtn') }}</span>
        </button>
      </div>
    </div>

    <!-- Уведомление -->
    <div
      v-if="toastMessage"
      class="bg-accent-emerald/10 border border-accent-emerald/30 rounded-2xl p-4 flex items-center justify-between text-accent-emerald text-xs font-medium"
    >
      <span>{{ toastMessage }}</span>
      <button @click="toastMessage = ''" class="text-accent-emerald/70 hover:text-accent-emerald">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Секция 0: Профиль и название карго-компании -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <Building2 class="w-5 h-5 text-accent-cyan shrink-0" />
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white">Профиль карго-компании</h3>
            <p class="text-[11px] text-text-secondary mt-0.5">Название и префикс кодов, которые отображаются в Telegram-боте, приложении и накладных</p>
          </div>
        </div>
        <span class="text-xs font-mono px-3 py-1 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 self-start sm:self-auto">
          /o/{{ currentSlug }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1.5 block">Название компании</label>
          <input
            v-model="store.settings.companyName"
            placeholder="Например: HAS Cargo, Silk Road Cargo"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-bold"
          />
        </div>
        <div>
          <label class="text-text-secondary mb-1.5 block">Префикс карго-кода клиентов</label>
          <input
            v-model="store.settings.codePrefix"
            placeholder="Например: NOOR/S или CARGO- или MIR- или CAR/"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none uppercase font-mono font-bold"
          />
          <p class="text-[10px] text-text-tertiary mt-1">Любой формат: <span class="text-accent-cyan font-mono">NOOR/S</span> → NOOR/S105, <span class="text-accent-cyan font-mono">CARGO-</span> → CARGO-105, <span class="text-accent-cyan font-mono">CAR/</span> → CAR/105</p>
        </div>
      </div>

      <div class="flex justify-end pt-1">
        <button
          @click="saveCompanyProfile"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Сохранить название компании</span>
        </button>
      </div>
    </div>

    <!-- Секция 0.5: Мой профиль и учетная запись (Владелец) -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <ShieldCheck class="w-5 h-5 text-accent-cyan shrink-0" />
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white">Мой профиль и учетная запись (Владелец)</h3>
            <p class="text-[11px] text-text-secondary mt-0.5">Личные данные владельца, номер телефона и пароль для входа в панель управления</p>
          </div>
        </div>
        <span class="text-xs font-mono px-3 py-1 rounded-lg bg-accent-blue/15 text-accent-cyan border border-accent-blue/30 self-start sm:self-auto flex items-center gap-1.5">
          <UserCheck class="w-3.5 h-3.5" />
          <span>{{ store.currentUser?.role || 'OWNER' }}</span>
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1.5 block">ФИО владельца</label>
          <input
            v-model="myProfileForm.fullName"
            placeholder="Рустам Каримов"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-medium"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Контактный телефон</label>
          <input
            v-model="myProfileForm.phone"
            placeholder="+992 90 000 0000"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Email (Логин для входа)</label>
          <input
            v-model="myProfileForm.email"
            type="email"
            placeholder="owner@cargona.io"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Новый пароль (если меняете)</label>
          <div class="relative">
            <input
              v-model="myProfileForm.password"
              :type="showMyPassword ? 'text' : 'password'"
              placeholder="••••••••"
              class="w-full h-10 pl-3 pr-10 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <button
              type="button"
              @click="showMyPassword = !showMyPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white transition cursor-pointer"
            >
              <Eye v-if="!showMyPassword" class="w-4 h-4" />
              <EyeOff v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-1">
        <button
          @click="saveMyProfile"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Сохранить мой профиль</span>
        </button>
      </div>
    </div>

    <!-- Секция 1: Управление сотрудниками (Штат карго) -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <Users class="w-5 h-5 text-accent-cyan" />
          <h3 class="text-sm sm:text-base font-bold text-white">Сотрудники и доступы</h3>
        </div>
        <span class="text-xs text-text-tertiary">{{ store.staff.length }} чел.</span>
      </div>

      <!-- Десктопная таблица -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-white/[0.06] text-text-tertiary font-semibold uppercase tracking-wider">
              <th class="pb-3 px-3">Сотрудник</th>
              <th class="pb-3 px-3">Роль</th>
              <th class="pb-3 px-3">Филиал / Склад</th>
              <th class="pb-3 px-3">Телефон</th>
              <th class="pb-3 px-3 text-right">Доступ</th>
              <th v-if="store.isOwner" class="pb-3 px-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="emp in store.staff" :key="emp.id" class="hover:bg-white/[0.02] transition">
              <td class="py-3.5 px-3 whitespace-nowrap">
                <div class="font-bold text-white">{{ emp.fullName }}</div>
                <div class="text-[11px] text-text-tertiary font-mono">{{ emp.email }}</div>
              </td>
              <td class="py-3.5 px-3 whitespace-nowrap">
                <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border" :class="getRoleBadgeClass(emp.role)">
                  {{ getRoleLabel(emp.role) }}
                </span>
              </td>
              <td class="py-3.5 px-3 whitespace-nowrap text-text-secondary">
                {{ emp.branchName }}
              </td>
              <td class="py-3.5 px-3 font-mono text-text-secondary whitespace-nowrap">
                {{ emp.phone }}
              </td>
              <td class="py-3.5 px-3 text-right whitespace-nowrap">
                <AppToggle
                  :modelValue="emp.isActive"
                  @update:modelValue="store.toggleEmployeeStatus(emp.id)"
                />
              </td>
              <td v-if="store.isOwner" class="py-3.5 px-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="openEditStaffModal(emp)"
                    title="Редактировать данные и пароль"
                    class="p-1.5 rounded-lg text-text-tertiary hover:text-accent-cyan hover:bg-accent-cyan/10 transition cursor-pointer"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    v-if="emp.role !== 'OWNER'"
                    @click="promptDeleteStaff(emp)"
                    title="Удалить сотрудника"
                    class="p-1.5 rounded-lg text-text-tertiary hover:text-accent-coral hover:bg-accent-coral/10 transition cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Мобильный вид: карточки сотрудников -->
      <div class="md:hidden space-y-3">
        <div
          v-for="emp in store.staff"
          :key="emp.id"
          class="bg-[#181B23]/70 p-3.5 rounded-2xl border border-white/[0.06] space-y-2.5"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="font-bold text-white text-sm">{{ emp.fullName }}</div>
              <div class="text-[11px] text-text-tertiary font-mono">{{ emp.email }}</div>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                @click="openEditStaffModal(emp)"
                title="Редактировать"
                class="p-1.5 rounded-lg text-text-tertiary hover:text-accent-cyan hover:bg-accent-cyan/10 transition cursor-pointer"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>
              <button
                v-if="store.isOwner && emp.role !== 'OWNER'"
                @click="promptDeleteStaff(emp)"
                title="Удалить сотрудника"
                class="p-1.5 rounded-lg text-text-tertiary hover:text-accent-coral hover:bg-accent-coral/10 transition cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
              <AppToggle
                :modelValue="emp.isActive"
                @update:modelValue="store.toggleEmployeeStatus(emp.id)"
              />
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.04] text-xs">
            <span class="px-2 py-0.5 rounded-lg text-[11px] font-semibold border" :class="getRoleBadgeClass(emp.role)">
              {{ getRoleLabel(emp.role) }}
            </span>
            <span class="text-text-secondary truncate max-w-[150px]">
              {{ emp.branchName }}
            </span>
          </div>

          <div class="flex items-center justify-between text-[11px] text-text-tertiary">
            <span>Телефон</span>
            <span class="font-mono text-text-secondary">{{ emp.phone }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Две колонки: Склад в Китае и Telegram-бот (BYOB) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Международные склады приема грузов (Страны отправления) -->
      <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-2.5">
            <Globe class="w-5 h-5 text-accent-cyan shrink-0" />
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white">Международные склады (Страны отправления)</h3>
              <p class="text-[11px] text-text-secondary mt-0.5">Адреса для клиентов в Mini App (Китай, Турция, ОАЭ, США и др.)</p>
            </div>
          </div>
          <button
            @click="showAddWarehouseModal = true"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-cyan text-xs font-bold transition cursor-pointer self-start sm:self-auto"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Добавить страну</span>
          </button>
        </div>

        <!-- Табы стран отправления -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="wh in store.originWarehouses"
            :key="wh.id"
            @click="activeWarehouseId = wh.id"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 cursor-pointer"
            :class="activeWarehouseId === wh.id
              ? 'bg-accent-blue text-white border-accent-blue shadow-glow-blue'
              : 'bg-white/[0.04] text-text-secondary border-white/[0.06] hover:text-white hover:bg-white/[0.08]'"
          >
            <AppleFlag :countryCode="wh.countryCode" :size="16" />
            <span>{{ wh.country }}</span>
            <span v-if="!wh.isActive" class="w-1.5 h-1.5 rounded-full bg-accent-coral ml-0.5"></span>
          </button>
        </div>

        <!-- Данные выбранного склада -->
        <div v-if="selectedWarehouse" class="space-y-3 text-xs bg-[#181B23]/70 p-3.5 sm:p-4 rounded-2xl border border-white/[0.06]">
          <div class="flex items-center justify-between">
            <span class="font-bold text-white text-xs flex items-center gap-2">
              <AppleFlag :countryCode="selectedWarehouse.countryCode" :size="18" />
              <span>{{ selectedWarehouse.country }} ({{ selectedWarehouse.city }})</span>
            </span>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-text-tertiary hidden sm:inline">{{ selectedWarehouse.isActive ? 'Склад активен' : 'Склад отключен' }}</span>
              <AppToggle v-model="selectedWarehouse.isActive" />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-text-secondary block">Адрес склада (копируется клиентом для покупок)</label>
              <div class="text-[10px] text-text-tertiary flex items-center gap-1 font-mono">
                <span>Теги:</span>
                <span class="px-1 py-0.5 rounded bg-white/[0.06] text-accent-cyan cursor-pointer" title="ID клиента">{id}</span>
                <span class="px-1 py-0.5 rounded bg-white/[0.06] text-accent-cyan cursor-pointer" title="Карго-код клиента">{code}</span>
                <span class="px-1 py-0.5 rounded bg-white/[0.06] text-accent-cyan cursor-pointer" title="ФИО клиента">{name}</span>
                <span class="px-1 py-0.5 rounded bg-white/[0.06] text-accent-cyan cursor-pointer" title="Телефон клиента">{phone}</span>
              </div>
            </div>
            <textarea
              v-model="selectedWarehouse.address"
              rows="2"
              class="w-full p-2.5 rounded-xl bg-[#13151B] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs resize-none"
            ></textarea>
            <p class="text-[10px] text-text-tertiary mt-0.5">Вставьте <code class="text-accent-cyan font-mono">{id}</code> или <code class="text-accent-cyan font-mono">{code}</code> в адрес или имя получателя — система автоматически подставит данные клиента при копировании.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-text-secondary mb-1 block">Контактный телефон (опционально)</label>
              <input
                v-model="selectedWarehouse.phone"
                placeholder="+00 000 0000 (необязательно)"
                class="w-full h-9 px-3 rounded-xl bg-[#13151B] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
              />
            </div>
            <div>
              <label class="text-text-secondary mb-1 block">Получатель / Контактное лицо (опционально)</label>
              <input
                v-model="selectedWarehouse.receiverName"
                placeholder="Имя получателя (необязательно)"
                class="w-full h-9 px-3 rounded-xl bg-[#13151B] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Инструкция для клиента (маркетплейсы, условия)</label>
            <input
              v-model="selectedWarehouse.instructions"
              placeholder="Для заказов с 1688, Taobao, Trendyol, Amazon..."
              class="w-full h-9 px-3 rounded-xl bg-[#13151B] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <!-- Скриншоты-инструкции для клиентов (Taobao, 1688, Trendyol и др.) -->
          <div class="space-y-1.5 pt-1">
            <div class="flex items-center justify-between">
              <label class="text-text-secondary block font-medium">Скриншоты-инструкции (Taobao, 1688, Trendyol и др.)</label>
              <span class="text-[10px] text-text-tertiary">Отображаются клиентам в Mini App</span>
            </div>

            <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
              <div
                v-for="(img, idx) in (selectedWarehouse.guidePhotos || [])"
                :key="idx"
                class="relative aspect-square rounded-xl overflow-hidden border border-white/[0.1] group bg-[#13151B]"
              >
                <img :src="img" class="w-full h-full object-cover" />
                <button
                  type="button"
                  @click="removeWarehousePhoto(selectedWarehouse, idx)"
                  class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white hover:bg-accent-coral flex items-center justify-center transition cursor-pointer"
                  title="Удалить скриншот"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>

              <label
                v-if="(!selectedWarehouse.guidePhotos || selectedWarehouse.guidePhotos.length < 6)"
                class="aspect-square rounded-xl border border-dashed border-white/[0.15] hover:border-accent-cyan/50 hover:bg-accent-cyan/5 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-text-tertiary hover:text-accent-cyan"
              >
                <Camera class="w-4 h-4" />
                <span class="text-[9px] font-semibold">Добавить</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="(e) => handleWarehousePhotoUpload(selectedWarehouse, e)"
                />
              </label>
            </div>
            <p class="text-[10px] text-text-tertiary">Прикрепите скриншоты полей маркетплейса с подсказками для клиентов</p>
          </div>

          <div class="pt-2 flex items-center justify-between">
            <button
              v-if="store.isOwner && selectedWarehouse"
              @click="promptDeleteWarehouse(selectedWarehouse)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent-coral/30 bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Удалить склад</span>
            </button>
            <div v-else></div>

            <button
              @click="saveWarehouseSettings"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
            >
              <Check class="w-3.5 h-3.5" />
              <span>Сохранить адрес склада</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Telegram Bot & Менеджер выкупа (BYOB) -->
      <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-2.5">
            <Bot class="w-5 h-5 text-accent-cyan shrink-0" />
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white">Telegram-бот компании (BYOB)</h3>
              <p class="text-[11px] text-text-secondary mt-0.5">Собственный бот для клиентов с Mini App</p>
            </div>
          </div>
          <a
            v-if="store.settings.botUsername"
            :href="`https://t.me/${store.settings.botUsername}`"
            target="_blank"
            class="text-xs font-mono text-accent-cyan hover:underline flex items-center gap-1"
          >
            <span>@{{ store.settings.botUsername }}</span>
            <ExternalLink class="w-3 h-3" />
          </a>
          <span v-else class="text-xs font-mono text-text-tertiary">@бот не подключен</span>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="text-text-secondary mb-1 block">API Token бота (@BotFather)</label>
            <input
              v-model="store.settings.botToken"
              type="text"
              placeholder="7192840192:AAH92js..."
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <p class="text-[10px] text-text-tertiary mt-1">Токен создается бесплатно в Telegram у бота @BotFather</p>
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Telegram username менеджера (выкуп товаров и вопросы клиентов)</label>
            <input
              v-model="store.settings.managerUsername"
              placeholder="@cargona_manager"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <p class="text-[10px] text-text-tertiary mt-1">Отображается в Mini App: кнопка быстрой связи для выкупа товаров и консультаций</p>
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Канал для автопостинга прибывших рейсов</label>
            <input
              v-model="store.settings.channelId"
              placeholder="@cargona_news"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Канал для публикации отзывов клиентов (с фото)</label>
            <input
              v-model="store.settings.reviewsChannelId"
              placeholder="@cargona_reviews"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <p class="text-[10px] text-text-tertiary mt-1">Отзывы клиентов с оценкой, комментарием и фото из Mini App будут автоматически публиковаться сюда</p>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span class="text-text-secondary">Автопостинг статусов рейсов в канал</span>
            <AppToggle v-model="store.settings.autoChannelPosting" />
          </div>

          <div class="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.04]">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" :class="store.settings.botToken ? 'bg-accent-emerald animate-pulse' : 'bg-accent-amber'"></span>
              <span class="text-[11px] text-text-secondary">
                {{ store.settings.botToken ? (store.settings.botUsername ? `Бот @${store.settings.botUsername} онлайн` : 'Токен указан (готов к сохранению)') : 'Бот не подключен' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <a
                v-if="store.settings.botUsername"
                :href="`https://t.me/${store.settings.botUsername}`"
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold transition border border-white/[0.08] flex items-center gap-1.5"
              >
                <span>Тест /start</span>
                <ExternalLink class="w-3 h-3 text-text-tertiary" />
              </a>
              <button
                @click="saveBotSettings"
                :disabled="isSavingBot"
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
              >
                <Check v-if="!isSavingBot" class="w-3.5 h-3.5" />
                <span v-else class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ isSavingBot ? 'Подключение...' : 'Сохранить настройки бота' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Секция 2.5: Программа лояльности и реферальная система (NOOR CLUB) -->
    <div v-if="store.isLoyaltyModuleAllowed" class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <Award class="w-5 h-5 text-accent-amber shrink-0" />
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-bold text-white">Программа лояльности ({{ store.loyaltySettings.clubName || 'NOOR CLUB' }})</h3>
              <span v-if="store.loyaltySettings.enabled" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
                Активна
              </span>
              <span v-else class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.05] text-text-tertiary border border-white/[0.08]">
                Выключена
              </span>
            </div>
            <p class="text-xs text-text-secondary mt-0.5">Персональные реферальные ссылки для клиентов, спец. тариф за приглашенных друзей и бонусный баланс</p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="text-xs text-text-secondary">Включить клуб</span>
          <AppToggle v-model="store.loyaltySettings.enabled" />
        </div>
      </div>

      <div v-if="store.loyaltySettings.enabled" class="space-y-4 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="text-text-secondary mb-1.5 block">Название клуба / программы</label>
            <input
              v-model="store.loyaltySettings.clubName"
              placeholder="NOOR CLUB"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-amber focus:outline-none font-bold"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1.5 block">Друзей для спец. тарифа (чел.)</label>
            <div class="relative">
              <input
                v-model.number="store.loyaltySettings.requiredActiveReferralsForSpecialRate"
                type="number"
                min="1"
                step="1"
                class="w-full h-10 px-3 pr-14 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-amber focus:outline-none font-mono"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
                чел.
              </span>
            </div>
            <p class="text-[10px] text-text-tertiary mt-1">После скольких активных друзей открывается спец. тариф</p>
          </div>

          <div>
            <label class="text-text-secondary mb-1.5 block">Спец. тариф со скидкой ({{ store.activeCurrency }}/кг)</label>
            <div class="relative">
              <input
                v-model.number="store.loyaltySettings.specialRatePerKg"
                type="number"
                min="1"
                step="0.5"
                class="w-full h-10 px-3 pr-16 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-amber focus:outline-none font-mono font-bold text-accent-amber"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
                {{ store.activeCurrency }}/кг
              </span>
            </div>
            <p class="text-[10px] text-text-tertiary mt-1">Применяется автоматически при достижении лимита друзей</p>
          </div>

          <div>
            <label class="text-text-secondary mb-1.5 block">Бонус за каждого след. друга ({{ store.activeCurrency }})</label>
            <div class="relative">
              <input
                v-model.number="store.loyaltySettings.bonusPerNextReferral"
                type="number"
                min="0"
                step="1"
                class="w-full h-10 px-3 pr-14 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-amber focus:outline-none font-mono"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
                {{ store.activeCurrency }}
              </span>
            </div>
            <p class="text-[10px] text-text-tertiary mt-1">Начисляется на баланс клиента за 3-го, 4-го и т.д. активного друга</p>
          </div>

          <div>
            <label class="text-text-secondary mb-1.5 block">Использование бонусов ({{ store.activeCurrency }} за 1 кг)</label>
            <div class="relative">
              <input
                v-model.number="store.loyaltySettings.bonusUsagePerKg"
                type="number"
                min="0.1"
                step="0.1"
                class="w-full h-10 px-3 pr-16 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-amber focus:outline-none font-mono"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
                {{ store.activeCurrency }}/кг
              </span>
            </div>
            <p class="text-[10px] text-text-tertiary mt-1">Максимальная скидка бонусами за 1 кг веса посылки</p>
          </div>

          <div>
            <label class="text-text-secondary mb-1.5 block">Мин. тариф после бонусов ({{ store.activeCurrency }}/кг)</label>
            <div class="relative">
              <input
                v-model.number="store.loyaltySettings.minRateAfterBonus"
                type="number"
                min="1"
                step="0.5"
                class="w-full h-10 px-3 pr-16 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-amber focus:outline-none font-mono"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
                {{ store.activeCurrency }}/кг
              </span>
            </div>
            <p class="text-[10px] text-text-tertiary mt-1">Нижний порог цены доставки за кг при списании бонусов</p>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-[#181B23]/70 border border-white/[0.06] flex items-center justify-between gap-4">
          <div class="text-text-secondary text-xs">
            <span class="font-bold text-white">Условие активности друга:</span> должен забрать как минимум
            <span class="font-mono text-accent-cyan font-bold">{{ store.loyaltySettings.activeReferralMinPackages || 1 }}</span> посылку в ПВЗ.
          </div>
          <button
            @click="saveLoyaltySettings"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-amber hover:bg-accent-amber/90 text-black font-bold text-xs shadow-glow-amber transition cursor-pointer shrink-0"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Сохранить настройки {{ store.loyaltySettings.clubName || 'NOOR CLUB' }}</span>
          </button>
        </div>
      </div>
      <div v-else class="text-text-tertiary text-xs py-2">
        Программа лояльности сейчас выключена. Включите тумблер выше, чтобы активировать персональные реферальные ссылки и начисление бонусов клиентам.
      </div>
    </div>

    <!-- Секция 3: Валюта расчетов и курсы конвертации -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <BadgeDollarSign class="w-5 h-5 text-accent-emerald shrink-0" />
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white">Валюта расчетов и обменные курсы</h3>
            <p class="text-xs text-text-secondary mt-0.5">Все суммы в системе автоматически пересчитываются по этим курсам</p>
          </div>
        </div>
        <span class="text-xs font-mono px-3 py-1 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 self-start sm:self-auto">
          Активная: {{ store.activeCurrency }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1.5 block">Основная валюта компании</label>
          <AppDropdown
            v-model="store.activeCurrency"
            :options="currencyOptions"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Курс 1 USD → TJS (Сомони)</label>
          <input
            v-model.number="store.ratesToUSD.TJS"
            type="number"
            step="0.01"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Курс 1 USD → RUB (Рубли)</label>
          <input
            v-model.number="store.ratesToUSD.RUB"
            type="number"
            step="0.1"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Курс 1 USD → CNY (Юани)</label>
          <input
            v-model.number="store.ratesToUSD.CNY"
            type="number"
            step="0.01"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>
      </div>
    </div>

    <!-- Секция 4: Тарифы доставки в выбранной валюте (<выбранная валюта>/кг) -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <Truck class="w-5 h-5 text-accent-cyan shrink-0" />
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white">Тарифы доставки</h3>
            <p class="text-xs text-text-secondary mt-0.5">Базовые ставки за килограмм груза в активной валюте: {{ store.activeCurrency }}/кг</p>
          </div>
        </div>
        <span class="text-xs font-mono px-3 py-1 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 self-start sm:self-auto">
          {{ store.activeCurrency }}/кг
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-text-secondary">Ставка Авто-доставки</label>
            <span v-if="store.activeCurrency !== 'USD'" class="text-[10px] text-text-tertiary font-mono">
              ≈ ${{ (rateForm.autoRatePerKg / (store.ratesToUSD[store.activeCurrency] || 1)).toFixed(2) }} USD/кг
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="rateForm.autoRatePerKg"
              @input="onRateFormChange"
              type="number"
              step="0.1"
              min="0.01"
              class="w-full h-10 px-3 pr-16 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
              {{ store.activeCurrency }}/кг
            </span>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-text-secondary">Ставка Авиа-доставки</label>
            <span v-if="store.activeCurrency !== 'USD'" class="text-[10px] text-text-tertiary font-mono">
              ≈ ${{ (rateForm.airRatePerKg / (store.ratesToUSD[store.activeCurrency] || 1)).toFixed(2) }} USD/кг
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="rateForm.airRatePerKg"
              @input="onRateFormChange"
              type="number"
              step="0.1"
              min="0.01"
              class="w-full h-10 px-3 pr-16 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
              {{ store.activeCurrency }}/кг
            </span>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-text-secondary">Мин. стоимость посылки</label>
            <span v-if="store.activeCurrency !== 'USD'" class="text-[10px] text-text-tertiary font-mono">
              ≈ ${{ (rateForm.minPackageCost / (store.ratesToUSD[store.activeCurrency] || 1)).toFixed(2) }} USD
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="rateForm.minPackageCost"
              @input="onRateFormChange"
              type="number"
              step="0.1"
              min="0.01"
              class="w-full h-10 px-3 pr-14 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
              {{ store.activeCurrency }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Секция 5: Сроки и стоимость хранения в ПВЗ -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <Clock class="w-5 h-5 text-accent-cyan shrink-0" />
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white">Сроки и стоимость хранения в ПВЗ</h3>
            <p class="text-xs text-text-secondary mt-0.5">Период бесплатного хранения и начисление за просрочку после прибытия посылки</p>
          </div>
        </div>
        <span class="text-xs font-mono px-3 py-1 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 self-start sm:self-auto">
          {{ store.settings.freeStorageDays || 3 }} дн. бесплатно
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1.5 block">Срок бесплатного хранения (дней)</label>
          <div class="relative">
            <input
              v-model.number="storageForm.freeStorageDays"
              type="number"
              min="0"
              step="1"
              placeholder="3"
              class="w-full h-10 px-3 pr-14 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
              дней
            </span>
          </div>
          <p class="text-[10px] text-text-tertiary mt-1">Отображается клиентам в Telegram Mini App</p>
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Стоимость платного хранения за день ({{ store.activeCurrency }}/день)</label>
          <div class="relative">
            <input
              v-model.number="storageForm.overdueRatePerDay"
              type="number"
              min="0"
              step="0.1"
              placeholder="5"
              class="w-full h-10 px-3 pr-20 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono pointer-events-none">
              {{ store.activeCurrency }}/день
            </span>
          </div>
          <p class="text-[10px] text-text-tertiary mt-1">Начисляется после окончания бесплатного периода</p>
        </div>
      </div>

      <div class="flex justify-end pt-1">
        <button
          @click="saveStorageSettings"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Сохранить условия хранения</span>
        </button>
      </div>
    </div>

    <!-- Секция 6: Реквизиты для оплаты переводом (Банковская карта / Перевод) -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <CreditCard class="w-5 h-5 text-accent-emerald shrink-0" />
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white">Реквизиты для оплаты переводом (Карта / Банк)</h3>
            <p class="text-xs text-text-secondary mt-0.5">Отображаются клиентам в Telegram Mini App и операторам на ПВЗ при выборе безналичной оплаты</p>
          </div>
        </div>
        <span class="text-xs font-mono px-3 py-1 rounded-lg bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 self-start sm:self-auto">
          {{ paymentForm.bankName ? paymentForm.bankName : 'Реквизиты не заданы' }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1.5 block">Банк / Сервис перевода</label>
          <input
            v-model="paymentForm.bankName"
            placeholder="Душанбе Сити / Alif Mobi / Сбербанк / T-Bank / Kaspi"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-emerald focus:outline-none"
          />
          <p class="text-[10px] text-text-tertiary mt-1">Название банка или платежного приложения</p>
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">Номер карты / Счета / Кошелька</label>
          <input
            v-model="paymentForm.cardNumber"
            placeholder="9762 0000 0000 0000"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-emerald focus:outline-none font-mono"
          />
          <p class="text-[10px] text-text-tertiary mt-1">Клиенты смогут скопировать этот номер в 1 клик</p>
        </div>

        <div>
          <label class="text-text-secondary mb-1.5 block">ФИО / Имя получателя</label>
          <input
            v-model="paymentForm.recipientName"
            placeholder="Абдуллоев А. / ООО Каргона"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-emerald focus:outline-none"
          />
          <p class="text-[10px] text-text-tertiary mt-1">Для сверки получателя перед переводом</p>
        </div>
      </div>

      <div>
        <label class="text-text-secondary mb-1.5 block text-xs">Инструкция для клиентов при переводе</label>
        <textarea
          v-model="paymentForm.instructions"
          rows="2"
          placeholder="В комментарии к переводу обязательно укажите ваш карго-код. После оплаты покажите чек сотруднику на ПВЗ."
          class="w-full p-2.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-emerald focus:outline-none text-xs resize-none placeholder:text-text-tertiary"
        ></textarea>
      </div>

      <div class="flex justify-end pt-1">
        <button
          @click="savePaymentSettings"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-emerald hover:bg-accent-emerald/90 text-white font-bold text-xs shadow-glow-emerald transition cursor-pointer"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Сохранить реквизиты перевода</span>
        </button>
      </div>
    </div>

    <!-- Модальное окно добавления сотрудника -->
    <AppModal v-model="showAddStaffModal" title="Добавить сотрудника">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">ФИО сотрудника</label>
          <input
            v-model="newEmployee.fullName"
            required
            placeholder="Рустам Каримов"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Email (Логин доступа)</label>
            <input
              v-model="newEmployee.email"
              type="email"
              required
              placeholder="operator@cargo.com"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Пароль для входа</label>
            <input
              v-model="newEmployee.password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Телефон</label>
          <input
            v-model="newEmployee.phone"
            placeholder="+992 90 111 2233"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Роль</label>
          <AppDropdown
            v-model="newEmployee.role"
            :options="roleOptions"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Привязка к филиалу</label>
          <AppDropdown
            v-model="newEmployee.branchId"
            :options="branchOptions"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showAddStaffModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="createStaff"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Добавить в штат
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Редактировать сотрудника -->
    <AppModal v-model="showEditStaffModal" title="Редактировать сотрудника">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">ФИО сотрудника</label>
          <input
            v-model="editingEmployee.fullName"
            required
            placeholder="Рустам Каримов"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Email (Логин доступа)</label>
            <input
              v-model="editingEmployee.email"
              type="email"
              required
              placeholder="operator@cargo.com"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Новый пароль (если меняете)</label>
            <div class="relative">
              <input
                v-model="editingEmployee.password"
                :type="showEditStaffPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full h-10 pl-3 pr-10 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
              />
              <button
                type="button"
                @click="showEditStaffPassword = !showEditStaffPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white transition cursor-pointer"
              >
                <Eye v-if="!showEditStaffPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Телефон</label>
          <input
            v-model="editingEmployee.phone"
            placeholder="+992 90 111 2233"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Роль</label>
          <AppDropdown
            v-model="editingEmployee.role"
            :options="roleOptions"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Привязка к филиалу</label>
          <AppDropdown
            v-model="editingEmployee.branchId"
            :options="branchOptions"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showEditStaffModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="saveEditedStaff"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Сохранить изменения
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Добавить международный склад отправки -->
    <AppModal v-model="showAddWarehouseModal" title="Добавить склад отправления">
      <div class="space-y-3.5 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Страна</label>
            <input
              v-model="newWh.country"
              placeholder="Германия / Турция / Корея"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Код страны (2 буквы)</label>
            <input
              v-model="newWh.countryCode"
              placeholder="DE / TR / KR"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none uppercase font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Город / Хаб</label>
          <input
            v-model="newWh.city"
            placeholder="Франкфурт / Стамбул / Сеул"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-text-secondary block">Точный адрес склада (для интернет-магазинов)</label>
            <div class="text-[10px] text-text-tertiary flex items-center gap-1 font-mono">
              <span>Теги:</span>
              <span class="px-1 py-0.5 rounded bg-white/[0.06] text-accent-cyan cursor-pointer" title="ID клиента">{id}</span>
              <span class="px-1 py-0.5 rounded bg-white/[0.06] text-accent-cyan cursor-pointer" title="Карго-код клиента">{code}</span>
            </div>
          </div>
          <textarea
            v-model="newWh.address"
            rows="2"
            placeholder="Улица, номер дома, складской индекс, {code}..."
            class="w-full p-2.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none text-xs font-mono resize-none"
          ></textarea>
          <p class="text-[10px] text-text-tertiary mt-0.5">Вставьте <code class="text-accent-cyan font-mono">{id}</code> или <code class="text-accent-cyan font-mono">{code}</code> — система автоматически подставит персональный код клиента при копировании.</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Контактный телефон (опционально)</label>
            <input
              v-model="newWh.phone"
              placeholder="+49 000 0000"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Получатель (опционально)</label>
            <input
              v-model="newWh.receiverName"
              placeholder="HUB Logistics"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Инструкция клиентам (какие магазины возить)</label>
          <input
            v-model="newWh.instructions"
            placeholder="Для заказов с Amazon, Zalando, Otto..."
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block font-medium">Скриншоты-инструкции по заполнению (опционально)</label>
          <div class="grid grid-cols-4 gap-2">
            <div
              v-for="(img, idx) in (newWh.guidePhotos || [])"
              :key="idx"
              class="relative aspect-square rounded-xl overflow-hidden border border-white/[0.1] group bg-[#13151B]"
            >
              <img :src="img" class="w-full h-full object-cover" />
              <button
                type="button"
                @click="newWh.guidePhotos.splice(idx, 1)"
                class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white hover:bg-rose-600 flex items-center justify-center transition cursor-pointer"
              >
                <X class="w-3 h-3" />
              </button>
            </div>

            <label
              v-if="(!newWh.guidePhotos || newWh.guidePhotos.length < 6)"
              class="aspect-square rounded-xl border border-dashed border-white/[0.15] hover:border-accent-cyan/50 hover:bg-accent-cyan/5 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-text-tertiary hover:text-accent-cyan"
            >
              <Camera class="w-4 h-4" />
              <span class="text-[9px] font-semibold">Добавить</span>
              <input
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleNewWhPhotoUpload"
              />
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showAddWarehouseModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="saveWarehouse"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Сохранить склад
        </button>
      </template>
    </AppModal>

    <!-- Диалог подтверждения удаления -->
    <AppConfirmModal
      v-model="confirmModal.isOpen"
      :title="confirmModal.title"
      :description="confirmModal.description"
      :targetName="confirmModal.targetName"
      confirmText="Удалить"
      confirmButtonClass="bg-accent-coral hover:bg-accent-coral/90 text-white"
      @confirm="handleConfirmAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  UserPlus,
  X,
  Users,
  Warehouse,
  Bot,
  BadgeDollarSign,
  Globe,
  Plus,
  Truck,
  Check,
  ExternalLink,
  Building2,
  Trash2,
  Award,
  Sparkles,
  Clock,
  CreditCard,
  Camera,
  Pencil,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import AppDropdown from '../components/ui/AppDropdown.vue';
import AppToggle from '../components/ui/AppToggle.vue';
import AppConfirmModal from '../components/ui/AppConfirmModal.vue';
import AppleFlag from '../components/ui/AppleFlag.vue';
import LanguageSwitcher from '../components/ui/LanguageSwitcher.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();
const showAddStaffModal = ref(false);
const showAddWarehouseModal = ref(false);
const toastMessage = ref('');

// Форма реквизитов для оплаты переводом
const paymentForm = ref({
  bankName: store.settings.paymentRequisites?.bankName || '',
  cardNumber: store.settings.paymentRequisites?.cardNumber || '',
  recipientName: store.settings.paymentRequisites?.recipientName || '',
  instructions: store.settings.paymentRequisites?.instructions || '',
});

watch(
  () => store.settings.paymentRequisites,
  (val) => {
    if (val) {
      paymentForm.value = {
        bankName: val.bankName || '',
        cardNumber: val.cardNumber || '',
        recipientName: val.recipientName || '',
        instructions: val.instructions || '',
      };
    }
  },
  { deep: true }
);

function savePaymentSettings() {
  store.updatePaymentRequisites(paymentForm.value);
  toastMessage.value = `Реквизиты для оплаты переводом успешно сохранены (${paymentForm.value.bankName || 'Банк'})`;
}

const confirmModal = ref({
  isOpen: false,
  title: '',
  description: '',
  targetName: '',
  actionType: '' as 'delete_staff' | 'delete_warehouse',
  targetId: '',
});

function promptDeleteStaff(emp: { id: string; fullName: string }) {
  confirmModal.value = {
    isOpen: true,
    title: 'Удаление сотрудника',
    description: 'Вы действительно хотите удалить сотрудника из штата? Доступ к системе для него будет заблокирован.',
    targetName: emp.fullName,
    actionType: 'delete_staff',
    targetId: emp.id,
  };
}

function promptDeleteWarehouse(wh: { id: string; country: string; city: string }) {
  confirmModal.value = {
    isOpen: true,
    title: 'Удаление международного склада',
    description: 'Вы уверены, что хотите удалить этот международный склад? Клиенты больше не увидят его адрес для оформления покупок.',
    targetName: `${wh.country} (${wh.city})`,
    actionType: 'delete_warehouse',
    targetId: wh.id,
  };
}

function handleConfirmAction() {
  if (confirmModal.value.actionType === 'delete_staff') {
    store.deleteEmployee(confirmModal.value.targetId);
    toastMessage.value = `Сотрудник «${confirmModal.value.targetName}» успешно удален`;
  } else if (confirmModal.value.actionType === 'delete_warehouse') {
    store.deleteOriginWarehouse(confirmModal.value.targetId);
    toastMessage.value = `Склад «${confirmModal.value.targetName}» успешно удален`;
    if (activeWarehouseId.value === confirmModal.value.targetId) {
      activeWarehouseId.value = store.originWarehouses[0]?.id || '';
    }
  }
  confirmModal.value.isOpen = false;
}

const currencyOptions = [
  { value: 'TJS', label: 'TJS — Сомони (Таджикистан)' },
  { value: 'USD', label: 'USD — Доллар США ($)' },
  { value: 'RUB', label: 'RUB — Рубль РФ (₽)' },
  { value: 'CNY', label: 'CNY — Юань (Китай ¥)' },
];

// Форма тарифов в выбранной валюте (<выбранная валюта>/кг)
const rateForm = ref({
  autoRatePerKg: store.deliveryRates.autoRatePerKg,
  airRatePerKg: store.deliveryRates.airRatePerKg,
  minPackageCost: store.deliveryRates.minPackageCost,
});

watch(
  () => [store.activeCurrency, store.ratesToUSD[store.activeCurrency]],
  () => {
    rateForm.value = {
      autoRatePerKg: store.deliveryRates.autoRatePerKg,
      airRatePerKg: store.deliveryRates.airRatePerKg,
      minPackageCost: store.deliveryRates.minPackageCost,
    };
    storageForm.value = {
      freeStorageDays: store.settings.freeStorageDays || 3,
      overdueRatePerDay: store.deliveryRates.storageOverdueRatePerDay || 5,
    };
  }
);

function onRateFormChange() {
  store.updateDeliveryRates(rateForm.value);
}

// Форма настроек хранения в ПВЗ
const storageForm = ref({
  freeStorageDays: store.settings.freeStorageDays || 3,
  overdueRatePerDay: store.deliveryRates.storageOverdueRatePerDay || 5,
});

function saveStorageSettings() {
  store.updateStorageSettings({
    freeStorageDays: storageForm.value.freeStorageDays,
    storageOverdueRatePerDay: storageForm.value.overdueRatePerDay,
  });
  toastMessage.value = `Условия хранения сохранены: ${storageForm.value.freeStorageDays} дн. бесплатно, далее ${storageForm.value.overdueRatePerDay} ${store.activeCurrency}/день`;
}

// Сохранение настроек программы лояльности (NOOR CLUB)
async function saveLoyaltySettings() {
  try {
    await store.updateLoyaltySettings(store.loyaltySettings);
    toastMessage.value = `Настройки программы лояльности «${store.loyaltySettings.clubName || 'NOOR CLUB'}» успешно сохранены`;
  } catch (err: any) {
    toastMessage.value = `Ошибка сохранения программы лояльности: ${err.message || 'Сбой сети'}`;
  }
}

const activeWarehouseId = ref('wh-cn');
const selectedWarehouse = computed(() => {
  return store.originWarehouses.find((w) => w.id === activeWarehouseId.value) || store.originWarehouses[0];
});

const newWh = ref({
  country: '',
  countryCode: 'TR',
  city: '',
  address: '',
  phone: '',
  receiverName: '',
  zipCode: '',
  instructions: '',
  guidePhotos: [] as string[],
});

async function compressImage(file: File, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

async function handleWarehousePhotoUpload(wh: any, event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  if (!wh.guidePhotos) wh.guidePhotos = [];
  const files = Array.from(target.files).slice(0, 6 - wh.guidePhotos.length);
  for (const file of files) {
    const compressed = await compressImage(file);
    if (compressed && wh.guidePhotos.length < 6) {
      wh.guidePhotos.push(compressed);
    }
  }
  target.value = '';
}

function removeWarehousePhoto(wh: any, index: number) {
  if (wh && wh.guidePhotos) {
    wh.guidePhotos.splice(index, 1);
  }
}

async function handleNewWhPhotoUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  if (!newWh.value.guidePhotos) newWh.value.guidePhotos = [];
  const files = Array.from(target.files).slice(0, 6 - newWh.value.guidePhotos.length);
  for (const file of files) {
    const compressed = await compressImage(file);
    if (compressed && newWh.value.guidePhotos.length < 6) {
      newWh.value.guidePhotos.push(compressed);
    }
  }
  target.value = '';
}

function saveWarehouse() {
  if (!newWh.value.country || !newWh.value.address) return;
  store.addOriginWarehouse({
    country: newWh.value.country.trim(),
    countryCode: newWh.value.countryCode.trim().toUpperCase() || 'XX',
    city: newWh.value.city.trim() || 'Центральный хаб',
    address: newWh.value.address.trim(),
    phone: newWh.value.phone ? newWh.value.phone.trim() : '',
    receiverName: newWh.value.receiverName ? newWh.value.receiverName.trim() : '',
    zipCode: newWh.value.zipCode ? newWh.value.zipCode.trim() : '',
    instructions: newWh.value.instructions ? newWh.value.instructions.trim() : '',
    guidePhotos: [...newWh.value.guidePhotos],
    isActive: true,
  });
  showAddWarehouseModal.value = false;
  toastMessage.value = `Склад отправления (${newWh.value.country}) успешно добавлен!`;
  newWh.value = { country: '', countryCode: 'TR', city: '', address: '', phone: '', receiverName: '', zipCode: '', instructions: '', guidePhotos: [] };
}

function saveWarehouseSettings() {
  if (selectedWarehouse.value) {
    store.updateOriginWarehouse(selectedWarehouse.value.id, selectedWarehouse.value);
    toastMessage.value = `Адрес склада «${selectedWarehouse.value.country}» и скриншоты сохранены`;
  }
}

import { useRoute } from 'vue-router';

const route = useRoute();
const isSavingBot = ref(false);

const currentSlug = computed(() => {
  return (route.params.slug as string) || store.activeTenantSlug || store.tenant?.slug || store.tenants[0]?.slug || 'cargona';
});

function saveCompanyProfile() {
  const name = store.settings.companyName.trim();
  const prefix = (store.settings.codePrefix || 'CRG').toUpperCase().trim();
  const slug = currentSlug.value;

  const t = store.tenants.find((item) => item.slug === slug);
  if (t) {
    t.name = name;
    t.codePrefix = prefix;
  }
  store.updateTenant(slug, { name, codePrefix: prefix });
  localStorage.setItem(`cargona_settings_${slug}`, JSON.stringify(store.settings));
  toastMessage.value = `Профиль компании обновлен: «${name}» (${prefix})`;

  // If bot token is set, sync with server immediately
  if (store.settings.botToken) {
    saveBotSettings();
  }
}

async function loadBotSettings() {
  try {
    const slug = currentSlug.value || 'cargona';
    const res = await fetch(`/api/o/${slug}/bot-settings`);
    if (res.ok) {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (data.botToken) store.settings.botToken = data.botToken;
      if (data.botUsername) store.settings.botUsername = data.botUsername;
      if (data.channelId) store.settings.channelId = data.channelId;
      if (data.reviewsChannelId) store.settings.reviewsChannelId = data.reviewsChannelId;
    }
  } catch (e) {
    // Local fallback
  }
}

onMounted(() => {
  if (route.params.slug) {
    store.setTenantSlug(route.params.slug as string);
  }
  loadBotSettings();
  store.loadLoyaltySettingsFromBackend?.();
});

watch(
  () => [route.params.slug, store.activeTenantSlug],
  ([newSlug]) => {
    if (newSlug && typeof newSlug === 'string') {
      store.setTenantSlug(newSlug);
    }
    loadBotSettings();
    store.loadLoyaltySettingsFromBackend?.();
  }
);

async function saveBotSettings() {
  const slug = currentSlug.value || 'cargona';
  const companyName = store.settings.companyName.trim() || store.tenant?.name || slug;
  isSavingBot.value = true;
  try {
    const res = await fetch(`/api/o/${slug}/bot-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: (store.settings.botToken || '').trim(),
        companyName,
        managerUsername: store.settings.managerUsername,
        channelId: store.settings.channelId,
        reviewsChannelId: store.settings.reviewsChannelId,
        autoChannelPosting: store.settings.autoChannelPosting,
      }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (!res.ok) {
        throw new Error(`Сервер вернул статус ${res.status}. Проверьте соединение.`);
      }
    }

    if (!res.ok || data.error) {
      toastMessage.value = data.error || 'Ошибка подключения бота к Telegram';
      return;
    }

    if (data.bot?.username) {
      store.settings.botUsername = data.bot.username;
      toastMessage.value = `Бот @${data.bot.username} успешно подключен к компании «${companyName}»! При отправке /start бот приветствует клиентов от имени вашей компании.`;
    } else {
      toastMessage.value = 'Настройки бота успешно сохранены';
    }

    localStorage.setItem(`cargona_settings_${slug}`, JSON.stringify(store.settings));
    localStorage.setItem('cargona_settings', JSON.stringify(store.settings));
    store.addAudit('UPDATE', 'Telegram Бот', 'Настройки бота', `Обновлен токен бота @${store.settings.botUsername || ''} для компании ${companyName}`);
  } catch (err: any) {
    toastMessage.value = `Ошибка: ${err.message || 'Не удалось связаться с сервером'}`;
  } finally {
    isSavingBot.value = false;
  }
}

const newEmployee = ref({
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'OPERATOR' as const,
  branchId: 'b-1',
});

// Профиль владельца (Мой профиль)
const myProfileForm = ref({
  fullName: '',
  phone: '',
  email: '',
  password: '',
});
const showMyPassword = ref(false);

function initMyProfile() {
  const currentEmail = store.currentUser?.email?.toLowerCase() || '';
  const foundEmp = store.staff.find((e) => (e.email && e.email.toLowerCase() === currentEmail) || e.role === 'OWNER');
  
  myProfileForm.value.fullName = store.currentUser?.name || foundEmp?.fullName || store.tenant?.name || 'Владелец Карго';
  myProfileForm.value.email = store.currentUser?.email || foundEmp?.email || store.tenant?.ownerEmail || '';
  myProfileForm.value.phone = foundEmp?.phone || '';
  myProfileForm.value.password = '';
}

watch(
  () => [store.currentUser, store.staff],
  () => {
    if (!myProfileForm.value.email) {
      initMyProfile();
    }
  },
  { immediate: true, deep: true }
);

function saveMyProfile() {
  const currentEmail = store.currentUser?.email?.toLowerCase() || '';
  const foundEmp = store.staff.find((e) => (e.email && e.email.toLowerCase() === currentEmail) || e.role === 'OWNER');
  const empId = foundEmp?.id || store.currentUser?.id || 'owner';

  const updateData: any = {
    fullName: myProfileForm.value.fullName.trim(),
    email: myProfileForm.value.email.trim(),
    phone: myProfileForm.value.phone.trim(),
  };
  if (myProfileForm.value.password.trim()) {
    updateData.password = myProfileForm.value.password.trim();
  }

  store.updateEmployee(empId, updateData);
  if (store.currentUser) {
    store.currentUser.name = updateData.fullName;
    store.currentUser.email = updateData.email;
  }
  if (store.tenant) {
    store.tenant.ownerEmail = updateData.email;
    if (updateData.password) store.tenant.ownerPassword = updateData.password;
  }
  myProfileForm.value.password = '';
  toastMessage.value = `Ваш профиль («${updateData.fullName}») успешно сохранен!`;
}

// Редактирование существующего сотрудника
const showEditStaffModal = ref(false);
const editingEmployee = ref({
  id: '',
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'OPERATOR' as any,
  branchId: 'b-1',
});
const showEditStaffPassword = ref(false);

function openEditStaffModal(emp: any) {
  editingEmployee.value = {
    id: emp.id,
    fullName: emp.fullName || '',
    email: emp.email || '',
    password: '',
    phone: emp.phone || '',
    role: emp.role || 'OPERATOR',
    branchId: emp.branchId || branchOptions.value[0]?.value || 'b-1',
  };
  showEditStaffPassword.value = false;
  showEditStaffModal.value = true;
}

function saveEditedStaff() {
  if (!editingEmployee.value.id || !editingEmployee.value.fullName) return;
  const branch = branchOptions.value.find((b) => b.value === editingEmployee.value.branchId);
  const payload: any = {
    fullName: editingEmployee.value.fullName.trim(),
    email: editingEmployee.value.email.trim(),
    phone: editingEmployee.value.phone.trim(),
    role: editingEmployee.value.role,
    branchId: editingEmployee.value.branchId,
    branchName: branch ? branch.label : 'Филиал',
  };
  if (editingEmployee.value.password.trim()) {
    payload.password = editingEmployee.value.password.trim();
  }
  store.updateEmployee(editingEmployee.value.id, payload);
  showEditStaffModal.value = false;
  toastMessage.value = `Данные сотрудника «${payload.fullName}» успешно обновлены!`;
}

const roleOptions = [
  { value: 'OPERATOR', label: 'Оператор выдачи ПВЗ' },
  { value: 'CASHIER', label: 'Кассир точки' },
  { value: 'SORTER', label: 'Кладовщик склада WMS' },
  { value: 'MANAGER', label: 'Управляющий филиалом' },
];

const branchOptions = computed(() => {
  return [
    ...store.branches.map((b) => ({ value: b.id, label: b.name })),
    { value: 'b-origin', label: 'Склад Иу (Китай)' },
  ];
});

function createStaff() {
  if (!newEmployee.value.fullName || !newEmployee.value.email || !newEmployee.value.password) return;
  const branch = branchOptions.value.find((b) => b.value === newEmployee.value.branchId);
  store.addEmployee({
    fullName: newEmployee.value.fullName,
    email: newEmployee.value.email.trim(),
    password: newEmployee.value.password,
    phone: newEmployee.value.phone || '+992 90 000 0000',
    role: newEmployee.value.role,
    branchId: newEmployee.value.branchId,
    branchName: branch ? branch.label : 'Филиал',
    isActive: true,
  });
  showAddStaffModal.value = false;
  toastMessage.value = `Сотрудник ${newEmployee.value.fullName} добавлен в систему (логин: ${newEmployee.value.email})`;
  newEmployee.value = { fullName: '', email: '', password: '', phone: '', role: 'OPERATOR', branchId: 'b-1' };
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'OPERATOR': return t('nav.rolePvz');
    case 'CASHIER': return t('nav.roleCashier');
    case 'SORTER': return t('nav.roleWms');
    case 'MANAGER': return t('nav.roleOwner');
    case 'OWNER': return t('nav.roleOwner');
    case 'SUPER_ADMIN': return t('nav.roleAdmin');
    default: return role;
  }
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'OPERATOR': return 'bg-accent-blue/15 text-accent-cyan border-accent-blue/30';
    case 'CASHIER': return 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30';
    case 'SORTER': return 'bg-accent-amber/15 text-accent-amber border-accent-amber/30';
    case 'MANAGER': return 'bg-accent-indigo/15 text-accent-indigo border-accent-indigo/30';
    default: return 'bg-white/[0.05] text-text-secondary border-white/[0.08]';
  }
}
</script>
