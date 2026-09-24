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
            placeholder="HAS / CRG / NOOR"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none uppercase font-mono font-bold"
          />
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
            <AppToggle
              :modelValue="emp.isActive"
              @update:modelValue="store.toggleEmployeeStatus(emp.id)"
            />
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
            <label class="text-text-secondary mb-1 block">Адрес склада (копируется клиентом для покупок)</label>
            <textarea
              v-model="selectedWarehouse.address"
              rows="2"
              class="w-full p-2.5 rounded-xl bg-[#13151B] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-text-secondary mb-1 block">Контактный телефон</label>
              <input
                v-model="selectedWarehouse.phone"
                class="w-full h-9 px-3 rounded-xl bg-[#13151B] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
              />
            </div>
            <div>
              <label class="text-text-secondary mb-1 block">Получатель (Контактное лицо)</label>
              <input
                v-model="selectedWarehouse.receiverName"
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

          <div class="pt-2 flex justify-end">
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
          <label class="text-text-secondary mb-1 block">Точный адрес склада (для интернет-магазинов)</label>
          <textarea
            v-model="newWh.address"
            rows="2"
            placeholder="Улица, номер дома, складской индекс..."
            class="w-full p-2.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none text-xs font-mono resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Контактный телефон</label>
            <input
              v-model="newWh.phone"
              placeholder="+49 000 0000"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Имя получателя</label>
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
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import AppDropdown from '../components/ui/AppDropdown.vue';
import AppToggle from '../components/ui/AppToggle.vue';
import AppleFlag from '../components/ui/AppleFlag.vue';
import LanguageSwitcher from '../components/ui/LanguageSwitcher.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();
const showAddStaffModal = ref(false);
const showAddWarehouseModal = ref(false);
const toastMessage = ref('');

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
});

function saveWarehouse() {
  if (!newWh.value.country || !newWh.value.address) return;
  store.addOriginWarehouse({
    country: newWh.value.country.trim(),
    countryCode: newWh.value.countryCode.trim().toUpperCase() || 'XX',
    city: newWh.value.city.trim() || 'Центральный хаб',
    address: newWh.value.address.trim(),
    phone: newWh.value.phone || '+00 000 0000',
    receiverName: newWh.value.receiverName || 'Логистический хаб',
    zipCode: newWh.value.zipCode || '00000',
    instructions: newWh.value.instructions || 'Для интернет-заказов',
    isActive: true,
  });
  showAddWarehouseModal.value = false;
  toastMessage.value = `Склад отправления (${newWh.value.country}) успешно добавлен!`;
  newWh.value = { country: '', countryCode: 'TR', city: '', address: '', phone: '', receiverName: '', zipCode: '', instructions: '' };
}

function saveWarehouseSettings() {
  if (selectedWarehouse.value) {
    store.updateOriginWarehouse(selectedWarehouse.value.id, selectedWarehouse.value);
    toastMessage.value = `Адрес склада «${selectedWarehouse.value.country}» успешно сохранен`;
  }
}

import { useRoute } from 'vue-router';

const route = useRoute();
const isSavingBot = ref(false);

const currentSlug = computed(() => {
  return (route.params.slug as string) || store.activeTenantSlug || store.tenant?.slug || store.tenants[0]?.slug || '';
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
    const slug = currentSlug.value;
    const res = await fetch(`/api/o/${slug}/bot-settings`);
    if (res.ok) {
      const data = await res.json();
      if (data.botToken) store.settings.botToken = data.botToken;
      if (data.botUsername) store.settings.botUsername = data.botUsername;
      if (data.channelId) store.settings.channelId = data.channelId;
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
});

watch(
  () => [route.params.slug, store.activeTenantSlug],
  ([newSlug]) => {
    if (newSlug && typeof newSlug === 'string') {
      store.setTenantSlug(newSlug);
    }
    loadBotSettings();
  }
);

async function saveBotSettings() {
  const slug = currentSlug.value;
  const companyName = store.settings.companyName.trim() || store.tenant?.name || slug;
  isSavingBot.value = true;
  try {
    const res = await fetch(`/api/o/${slug}/bot-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: store.settings.botToken,
        companyName,
        managerUsername: store.settings.managerUsername,
        channelId: store.settings.channelId,
        autoChannelPosting: store.settings.autoChannelPosting,
      }),
    });

    const data = await res.json();

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
    toastMessage.value = `Ошибка сети: ${err.message || 'Не удалось связаться с сервером'}`;
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
