<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка раздела и Быстрые действия -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ t('finance.title') }}</h1>
        <p class="text-xs text-text-tertiary mt-0.5">Комплексный учет касс, P&L, расходов OPEX, себестоимости рейсов и взаиморасчетов</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="openExpenseModal"
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
        >
          <TrendingDown class="w-4 h-4 text-rose-400" />
          <span>Расход</span>
        </button>

        <button
          @click="openIncomeModal"
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
        >
          <TrendingUp class="w-4 h-4 text-emerald-400" />
          <span>Доход</span>
        </button>

        <button
          @click="openTransferModal"
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-cyan border border-accent-blue/30 text-xs font-semibold transition cursor-pointer"
        >
          <ArrowRightLeft class="w-4 h-4 text-accent-cyan" />
          <span>Перевод</span>
        </button>

        <div class="relative inline-block text-left" ref="exportMenuRef">
          <button
            @click="isExportMenuOpen = !isExportMenuOpen"
            class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] text-xs font-semibold transition cursor-pointer"
          >
            <Download class="w-4 h-4 text-text-tertiary" />
            <span>Экспорт</span>
          </button>

          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="isExportMenuOpen"
              class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl bg-[#181B23] border border-white/[0.1] shadow-2xl p-1.5 focus:outline-none backdrop-blur-xl"
            >
              <button
                @click="triggerExport('TRANSACTIONS')"
                class="w-full text-left px-3 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-white hover:bg-white/[0.04] transition flex items-center justify-between"
              >
                <span>Журнал операций (CSV)</span>
                <FileText class="w-3.5 h-3.5 text-text-tertiary" />
              </button>
              <button
                @click="triggerExport('COLLECTIONS')"
                class="w-full text-left px-3 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-white hover:bg-white/[0.04] transition flex items-center justify-between"
              >
                <span>Журнал инкассаций (CSV)</span>
                <Wallet class="w-3.5 h-3.5 text-text-tertiary" />
              </button>
              <button
                @click="triggerExport('TRIPS')"
                class="w-full text-left px-3 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-white hover:bg-white/[0.04] transition flex items-center justify-between"
              >
                <span>Экономика рейсов (CSV)</span>
                <Truck class="w-3.5 h-3.5 text-text-tertiary" />
              </button>
              <button
                @click="triggerExport('DEBTORS')"
                class="w-full text-left px-3 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-white hover:bg-white/[0.04] transition flex items-center justify-between"
              >
                <span>Реестр должников (CSV)</span>
                <Receipt class="w-3.5 h-3.5 text-text-tertiary" />
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Уведомление -->
    <div
      v-if="toastMessage"
      class="bg-accent-emerald/10 border border-accent-emerald/30 rounded-2xl p-4 flex items-center justify-between text-accent-emerald text-xs font-medium"
    >
      <span>{{ toastMessage }}</span>
      <button @click="toastMessage = ''" class="text-accent-emerald/70 hover:text-accent-emerald cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- 5 Финансовых KPI (P&L и Кассовые активы) -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <!-- 1. Выручка -->
      <div class="bg-surface border border-surface-border rounded-2xl p-4 shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
          <TrendingUp class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] text-text-tertiary font-semibold uppercase truncate">Выручка</div>
          <div class="text-base sm:text-lg font-black text-white mt-0.5 truncate font-mono">
            {{ store.formatMoney(store.financialSummary.deliveredRevenueUSD) }}
          </div>
          <div class="text-[10px] text-text-secondary truncate">Выдано в ПВЗ</div>
        </div>
      </div>

      <!-- 2. Себестоимость доставки (COGS) -->
      <div class="bg-surface border border-surface-border rounded-2xl p-4 shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
          <Truck class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] text-text-tertiary font-semibold uppercase truncate">Прямые расходы</div>
          <div class="text-base sm:text-lg font-black text-white mt-0.5 truncate font-mono">
            {{ store.formatMoney(store.financialSummary.directFreightCostsUSD) }}
          </div>
          <div class="text-[10px] text-text-secondary truncate">Рейсы & Таможня</div>
        </div>
      </div>

      <!-- 3. OPEX -->
      <div class="bg-surface border border-surface-border rounded-2xl p-4 shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <TrendingDown class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] text-text-tertiary font-semibold uppercase truncate">Расходы (OPEX)</div>
          <div class="text-base sm:text-lg font-black text-white mt-0.5 truncate font-mono">
            {{ store.formatMoney(store.financialSummary.opexUSD) }}
          </div>
          <div class="text-[10px] text-text-secondary truncate">Аренда, ФОТ, связь</div>
        </div>
      </div>

      <!-- 4. Чистая прибыль (Net Profit) -->
      <div class="bg-surface border border-surface-border rounded-2xl p-4 shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <CircleDollarSign class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] text-text-tertiary font-semibold uppercase truncate">Чистая прибыль</div>
          <div class="text-base sm:text-lg font-black text-emerald-400 mt-0.5 truncate font-mono">
            {{ store.formatMoney(store.financialSummary.netProfitUSD) }}
          </div>
          <div class="text-[10px] text-emerald-400/90 font-medium truncate">
            Маржа: {{ store.financialSummary.marginPercent }}%
          </div>
        </div>
      </div>

      <!-- 5. Касса в сети (Cash in circulation) -->
      <div class="bg-surface border border-surface-border rounded-2xl p-4 shadow-card flex items-center gap-3 col-span-2 md:col-span-1">
        <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <Wallet class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] text-text-tertiary font-semibold uppercase truncate">Всего в кассах</div>
          <div class="text-base sm:text-lg font-black text-amber-300 mt-0.5 truncate font-mono">
            {{ store.formatMoney(store.financialSummary.totalCashUSD) }}
          </div>
          <div class="text-[10px] text-text-secondary truncate">ПВЗ + Сейф + Банк</div>
        </div>
      </div>
    </div>

    <!-- Вкладки финансового модуля -->
    <div class="flex items-center gap-2 border-b border-white/[0.08] overflow-x-auto scrollbar-none pb-px">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2.5 rounded-t-xl text-xs font-semibold transition border-b-2 whitespace-nowrap flex items-center gap-2 cursor-pointer"
        :class="activeTab === tab.id
          ? 'border-accent-cyan text-white bg-white/[0.04]'
          : 'border-transparent text-text-secondary hover:text-white hover:bg-white/[0.02]'"
      >
        <component :is="tab.icon" class="w-4 h-4" :class="activeTab === tab.id ? 'text-accent-cyan' : 'text-text-tertiary'" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.badge"
          class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          :class="tab.badgeClass || 'bg-white/[0.1] text-white'"
        >
          {{ tab.badge }}
        </span>
      </button>
    </div>

    <!-- ========================================== -->
    <!-- ВКЛАДКА 1: ОБЗОР И ДИНАМИКА P&L -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'OVERVIEW'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- График выручки по дням -->
        <div class="lg:col-span-2 bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white">Динамика выручки за 7 дней</h3>
              <p class="text-xs text-text-secondary mt-0.5">Ежедневный объем выданных посылок и кассовых поступлений</p>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-text-tertiary uppercase font-semibold">Итого за 7 дней</div>
              <div class="text-sm sm:text-base font-mono font-bold text-accent-cyan">
                {{ store.formatMoney(chartTotalUSD) }}
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <div class="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-4 px-2 min-w-[320px]">
              <div
                v-for="bar in chartData"
                :key="bar.day"
                class="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer"
              >
                <div class="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold text-accent-cyan whitespace-nowrap bg-black/90 px-2 py-0.5 rounded-lg border border-accent-cyan/30 shadow-lg">
                  {{ store.formatMoney(bar.amountUSD) }}
                </div>
                <div class="w-full max-w-[44px] h-32 bg-white/[0.03] border border-white/[0.06] rounded-t-xl overflow-hidden relative flex items-end p-0.5 group-hover:bg-white/[0.08] transition">
                  <div
                    class="w-full bg-gradient-to-t from-accent-blue via-accent-cyan to-white/90 rounded-t-lg transition-all duration-500 shadow-glow-cyan"
                    :style="{ height: `${Math.max(8, Math.round((bar.amountUSD / maxBarAmount) * 100))}%` }"
                  ></div>
                </div>
                <span class="text-[11px] font-mono font-medium text-text-tertiary group-hover:text-white transition">
                  {{ bar.day }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Структура расходов (OPEX breakdown) -->
        <div class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
          <div class="border-b border-white/[0.06] pb-3">
            <h3 class="text-sm sm:text-base font-bold text-white">Структура расходов</h3>
            <p class="text-xs text-text-secondary mt-0.5">Распределение затрат компании по статьям</p>
          </div>

          <div class="space-y-2.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
            <div
              v-for="cat in opexCategoryBreakdown"
              :key="cat.code"
              class="p-3 rounded-2xl bg-[#181B23] border border-white/[0.06] flex items-center justify-between text-xs"
            >
              <div class="min-w-0 pr-2">
                <div class="font-semibold text-white truncate">{{ cat.name }}</div>
                <div class="text-[10px] text-text-tertiary mt-0.5">{{ cat.percent }}% от всех расходов</div>
              </div>
              <div class="text-right shrink-0">
                <div class="font-mono font-bold text-white">{{ store.formatMoney(cat.amountUSD) }}</div>
              </div>
            </div>

            <div v-if="opexCategoryBreakdown.length === 0" class="p-6 text-center text-xs text-text-tertiary">
              Расходов пока нет. Нажмите «+ Расход» для добавления.
            </div>
          </div>
        </div>
      </div>

      <!-- Действующие тарифы доставки -->
      <div class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Базовые тарифы доставки</h3>
            <p class="text-xs text-text-secondary mt-0.5">Ставки расчета стоимости для клиентов в валюте: {{ store.activeCurrency }}</p>
          </div>
          <button
            @click="openTariffModal"
            class="px-3 py-1.5 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-cyan border border-accent-blue/30 text-xs font-semibold transition cursor-pointer"
          >
            Изменить тарифы
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-4 rounded-2xl bg-[#181B23] border border-white/[0.06] flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
                <Truck class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-bold text-white">Авто-доставка</div>
                <div class="text-[10px] text-text-secondary">Китай → ПВЗ (10–14 дней)</div>
              </div>
            </div>
            <div class="text-sm font-mono font-bold text-accent-cyan">{{ store.deliveryRates.formattedAuto }}</div>
          </div>

          <div class="p-4 rounded-2xl bg-[#181B23] border border-white/[0.06] flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
                <Plane class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-bold text-white">Авиа-доставка</div>
                <div class="text-[10px] text-text-secondary">Урумчи → ПВЗ (3–5 дней)</div>
              </div>
            </div>
            <div class="text-sm font-mono font-bold text-accent-cyan">{{ store.deliveryRates.formattedAir }}</div>
          </div>

          <div class="p-4 rounded-2xl bg-[#181B23] border border-white/[0.06] flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Clock class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-bold text-white">Хранение в ПВЗ</div>
                <div class="text-[10px] text-text-secondary">Бесплатно {{ store.settings.freeStorageDays || 3 }} дня</div>
              </div>
            </div>
            <div class="text-xs font-mono font-bold text-amber-300">{{ store.deliveryRates.formattedStorageOverdue }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- ВКЛАДКА 2: КАССЫ И ИНКАССАЦИЯ (ДДС) -->
    <!-- ========================================== -->
    <div v-else-if="activeTab === 'CASHBOXES'" class="space-y-6">
      <!-- Счета и кассы -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="acc in store.cashAccounts"
          :key="acc.id"
          class="bg-surface border border-surface-border rounded-3xl p-5 shadow-card space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                :class="acc.type === 'SAFE'
                  ? 'bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald'
                  : acc.type === 'BANK'
                  ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-cyan'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'"
              >
                <Building2 v-if="acc.type === 'SAFE'" class="w-4 h-4" />
                <CircleDollarSign v-else-if="acc.type === 'BANK'" class="w-4 h-4" />
                <Wallet v-else class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-bold text-white">{{ acc.name }}</div>
                <div class="text-[10px] text-text-tertiary">
                  {{ acc.type === 'SAFE' ? 'Главный сейф' : acc.type === 'BANK' ? 'Безналичный счет' : 'Касса ПВЗ' }}
                </div>
              </div>
            </div>

            <span class="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.04] text-text-secondary border border-white/[0.08]">
              {{ store.activeCurrency }}
            </span>
          </div>

          <div class="pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <div>
              <div class="text-[10px] text-text-tertiary">Текущий баланс</div>
              <div class="text-lg font-black text-white font-mono mt-0.5">
                {{ store.formatMoney(acc.balanceUSD) }}
              </div>
            </div>

            <button
              v-if="acc.type === 'CASH_PVZ' && acc.branchId"
              @click="openCollectionModal(acc.branchId)"
              :disabled="acc.balanceUSD <= 0"
              class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-xs border border-amber-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet class="w-3.5 h-3.5" />
              <span>Инкассировать</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Журнал инкассаций -->
      <div class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Журнал инкассаций</h3>
            <p class="text-xs text-text-secondary mt-0.5">Передача наличных денег из касс филиалов в Главный сейф</p>
          </div>
          <span class="text-xs text-text-tertiary font-mono">{{ store.cashCollections.length }} записей</span>
        </div>

        <div class="overflow-x-auto -mx-3 sm:mx-0">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/[0.02] text-text-tertiary text-[10px] uppercase border-b border-white/[0.06]">
              <tr>
                <th class="p-3">№ Квитанции</th>
                <th class="p-3">Дата</th>
                <th class="p-3">Филиал (ПВЗ)</th>
                <th class="p-3">Сумма</th>
                <th class="p-3">Запросил</th>
                <th class="p-3">Статус</th>
                <th class="p-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="col in store.cashCollections" :key="col.id" class="hover:bg-white/[0.02] transition">
                <td class="p-3 font-mono font-bold text-accent-cyan">{{ col.receiptNumber }}</td>
                <td class="p-3 text-text-secondary text-[11px]">{{ new Date(col.createdAt).toLocaleString('ru-RU') }}</td>
                <td class="p-3 font-medium text-white">{{ col.sourceBranchName || col.sourceBranchId }}</td>
                <td class="p-3 font-mono font-bold text-white">{{ store.formatMoney(col.amountUSD) }}</td>
                <td class="p-3 text-text-secondary text-[11px]">{{ col.requestedBy }}</td>
                <td class="p-3">
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1"
                    :class="col.status === 'CONFIRMED'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : col.status === 'REJECTED'
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'"
                  >
                    <CheckCircle2 v-if="col.status === 'CONFIRMED'" class="w-3 h-3" />
                    <XCircle v-else-if="col.status === 'REJECTED'" class="w-3 h-3" />
                    <Clock v-else class="w-3 h-3" />
                    <span>{{ col.status === 'CONFIRMED' ? 'В сейфе' : col.status === 'REJECTED' ? 'Отклонено' : 'В пути (ожидает)' }}</span>
                  </span>
                </td>
                <td class="p-3 text-right">
                  <div v-if="col.status === 'REQUESTED'" class="flex items-center justify-end gap-1.5">
                    <button
                      @click="confirmCollection(col.id)"
                      class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30 transition cursor-pointer"
                    >
                      Принять
                    </button>
                    <button
                      @click="rejectCollection(col.id)"
                      class="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-[11px] border border-rose-500/30 transition cursor-pointer"
                    >
                      Отклонить
                    </button>
                  </div>
                  <span v-else class="text-[11px] text-text-tertiary">
                    {{ col.confirmedBy ? `Принял: ${col.confirmedBy}` : '-' }}
                  </span>
                </td>
              </tr>

              <tr v-if="store.cashCollections.length === 0">
                <td colspan="7" class="p-8 text-center text-text-tertiary text-xs">
                  Заявок на инкассацию пока нет.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- ВКЛАДКА 3: РАСХОДЫ И ДОХОДЫ (ТРАНЗАКЦИИ) -->
    <!-- ========================================== -->
    <div v-else-if="activeTab === 'TRANSACTIONS'" class="space-y-4">
      <div class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Журнал финансовых операций</h3>
            <p class="text-xs text-text-secondary mt-0.5">Все притоки, оттоки, выплаты и переводы организации</p>
          </div>

          <div class="flex items-center gap-2">
            <AppDropdown
              v-model="txTypeFilter"
              :options="txTypeFilterOptions"
              class="w-36"
            />
          </div>
        </div>

        <div class="overflow-x-auto -mx-3 sm:mx-0">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/[0.02] text-text-tertiary text-[10px] uppercase border-b border-white/[0.06]">
              <tr>
                <th class="p-3">Дата</th>
                <th class="p-3">Тип</th>
                <th class="p-3">Статья / Категория</th>
                <th class="p-3">Сумма</th>
                <th class="p-3">Счет</th>
                <th class="p-3">Филиал / Комментарий</th>
                <th class="p-3 text-right">Автор</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="t in filteredTransactions" :key="t.id" class="hover:bg-white/[0.02] transition">
                <td class="p-3 text-text-secondary font-mono text-[11px] whitespace-nowrap">
                  {{ new Date(t.createdAt).toLocaleString('ru-RU') }}
                </td>
                <td class="p-3">
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                    :class="t.type === 'INCOME' || t.type === 'CUSTOMER_PAYMENT'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : t.type === 'EXPENSE' || t.type === 'CUSTOMER_REFUND'
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-accent-blue/15 text-accent-cyan border border-accent-blue/30'"
                  >
                    {{ t.type === 'INCOME' ? 'Доход' : t.type === 'CUSTOMER_PAYMENT' ? 'Оплата' : t.type === 'EXPENSE' ? 'Расход' : t.type === 'CUSTOMER_REFUND' ? 'Возврат' : 'Перевод' }}
                  </span>
                </td>
                <td class="p-3 font-semibold text-white">{{ t.category }}</td>
                <td class="p-3 font-mono font-bold whitespace-nowrap" :class="t.type === 'INCOME' || t.type === 'CUSTOMER_PAYMENT' ? 'text-emerald-400' : t.type === 'EXPENSE' || t.type === 'CUSTOMER_REFUND' ? 'text-rose-400' : 'text-accent-cyan'">
                  {{ t.type === 'INCOME' || t.type === 'CUSTOMER_PAYMENT' ? '+' : t.type === 'EXPENSE' || t.type === 'CUSTOMER_REFUND' ? '-' : '' }}{{ store.formatMoney(t.amountUSD) }}
                </td>
                <td class="p-3 text-text-secondary text-[11px]">{{ getAccountName(t.accountId) }}</td>
                <td class="p-3 text-text-secondary text-[11px] max-w-xs truncate">
                  {{ t.comment || getBranchName(t.relatedBranchId) || '-' }}
                </td>
                <td class="p-3 text-right text-text-tertiary text-[11px]">{{ t.createdBy }}</td>
              </tr>

              <tr v-if="filteredTransactions.length === 0">
                <td colspan="7" class="p-8 text-center text-text-tertiary text-xs">
                  Операций не найдено.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- ВКЛАДКА 4: ЭКОНОМИКА РЕЙСОВ (МАРЖИНАЛЬНОСТЬ) -->
    <!-- ========================================== -->
    <div v-else-if="activeTab === 'TRIPS'" class="space-y-4">
      <div class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Маржинальность и экономика рейсов</h3>
            <p class="text-xs text-text-secondary mt-0.5">Сравнение выручки за посылки с прямыми затратами на перевозку и таможню</p>
          </div>
        </div>

        <div class="overflow-x-auto -mx-3 sm:mx-0">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/[0.02] text-text-tertiary text-[10px] uppercase border-b border-white/[0.06]">
              <tr>
                <th class="p-3">Код рейса</th>
                <th class="p-3">Маршрут / Статус</th>
                <th class="p-3">Вес / Посылок</th>
                <th class="p-3">Выручка</th>
                <th class="p-3">Себестоимость</th>
                <th class="p-3">Прибыль</th>
                <th class="p-3">Маржа (%)</th>
                <th class="p-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="tf in store.tripFinancials" :key="tf.id" class="hover:bg-white/[0.02] transition">
                <td class="p-3 font-mono font-bold text-accent-cyan">{{ tf.tripCode }}</td>
                <td class="p-3">
                  <div class="font-medium text-white">{{ tf.route }}</div>
                  <div class="text-[10px] text-text-tertiary">{{ tf.status }}</div>
                </td>
                <td class="p-3 font-mono">
                  <div class="text-white">{{ tf.actualWeightKg }} кг</div>
                  <div class="text-[10px] text-text-tertiary">{{ tf.packageCount }} посылок</div>
                </td>
                <td class="p-3 font-mono font-bold text-white">{{ store.formatMoney(tf.revenueUSD) }}</td>
                <td class="p-3 font-mono font-bold text-rose-300">{{ store.formatMoney(tf.directCostUSD) }}</td>
                <td class="p-3 font-mono font-bold" :class="tf.marginUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                  {{ store.formatMoney(tf.marginUSD) }}
                </td>
                <td class="p-3 font-mono font-bold" :class="tf.marginPercent >= 30 ? 'text-emerald-400' : tf.marginPercent > 0 ? 'text-amber-300' : 'text-rose-400'">
                  {{ tf.marginPercent }}%
                </td>
                <td class="p-3 text-right">
                  <button
                    @click="openTripExpenseModal(tf.id)"
                    class="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-accent-cyan border border-white/[0.08] text-[11px] font-semibold transition cursor-pointer"
                  >
                    + Расход на рейс
                  </button>
                </td>
              </tr>

              <tr v-if="store.tripFinancials.length === 0">
                <td colspan="8" class="p-8 text-center text-text-tertiary text-xs">
                  Рейсов пока нет. Создайте рейс в разделе «Рейсы».
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- ВКЛАДКА 5: ДОЛЖНИКИ И БАЛАНСЫ КЛИЕНТОВ -->
    <!-- ========================================== -->
    <div v-else-if="activeTab === 'DEBTORS'" class="space-y-4">
      <div class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Реестр дебиторской задолженности</h3>
            <p class="text-xs text-text-secondary mt-0.5">Клиенты с отрицательным балансом (посылки, выданные с отсрочкой оплаты)</p>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Общий долг клиентуры</div>
            <div class="text-base font-mono font-bold text-rose-400">
              {{ store.formatMoney(store.financialSummary.totalDebtUSD) }}
            </div>
          </div>
        </div>

        <div class="overflow-x-auto -mx-3 sm:mx-0">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/[0.02] text-text-tertiary text-[10px] uppercase border-b border-white/[0.06]">
              <tr>
                <th class="p-3">Карго-код</th>
                <th class="p-3">Клиент</th>
                <th class="p-3">Телефон</th>
                <th class="p-3">ПВЗ</th>
                <th class="p-3">Сумма долга</th>
                <th class="p-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="d in store.financialSummary.debtors" :key="d.id" class="hover:bg-white/[0.02] transition">
                <td class="p-3 font-mono font-bold text-accent-cyan">{{ d.cargoCode }}</td>
                <td class="p-3 font-medium text-white">{{ d.fullName }}</td>
                <td class="p-3 font-mono text-text-secondary text-[11px]">{{ d.phone }}</td>
                <td class="p-3 text-text-secondary text-[11px]">{{ getBranchName(d.preferredBranchId) }}</td>
                <td class="p-3 font-mono font-bold text-rose-400">
                  {{ store.formatMoney(Math.abs(d.balanceUSD)) }}
                </td>
                <td class="p-3 text-right">
                  <button
                    @click="openCustomerBalanceModal(d)"
                    class="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30 transition cursor-pointer"
                  >
                    Погасить долг
                  </button>
                </td>
              </tr>

              <tr v-if="store.financialSummary.debtors.length === 0">
                <td colspan="6" class="p-8 text-center text-text-tertiary text-xs">
                  Задолженностей нет. Все клиенты рассчитались вовремя.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- МОДАЛЬНЫЕ ОКНА ФИНАНСОВЫХ ОПЕРАЦИЙ -->
    <!-- ========================================== -->

    <!-- 1. Модалка внесения расхода (OPEX) -->
    <AppModal v-model="showExpenseModal" title="Внесение расхода компании">
      <div class="space-y-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Категория расхода</label>
          <AppDropdown
            v-model="expenseForm.category"
            :options="expenseCategoryOptions"
            placeholder="Выберите статью"
            class="w-full"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Сумма расхода ({{ store.activeCurrency }})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              v-model.number="expenseForm.amount"
              placeholder="150"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-rose-400 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Списать со счета / кассы</label>
            <AppDropdown
              v-model="expenseForm.accountId"
              :options="cashAccountOptions"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Филиал / ПВЗ (опционально)</label>
          <AppDropdown
            v-model="expenseForm.branchId"
            :options="branchOptionsWithNone"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Комментарий / Примечание</label>
          <input
            v-model="expenseForm.comment"
            placeholder="Оплата аренды за текущий месяц"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-rose-400 focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showExpenseModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="submitExpense"
          class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(225,29,72,0.3)] transition cursor-pointer flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Провести расход</span>
        </button>
      </template>
    </AppModal>

    <!-- 2. Модалка внесения дохода -->
    <AppModal v-model="showIncomeModal" title="Внесение прочего дохода">
      <div class="space-y-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Категория дохода</label>
          <input
            v-model="incomeForm.category"
            placeholder="Доп. услуги (выкуп, упаковка, страховка)"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-emerald focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Сумма ({{ store.activeCurrency }})</label>
            <input
              type="number"
              step="0.01"
              v-model.number="incomeForm.amount"
              placeholder="300"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-emerald focus:outline-none font-mono"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Зачислить на счет</label>
            <AppDropdown
              v-model="incomeForm.accountId"
              :options="cashAccountOptions"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Комментарий</label>
          <input
            v-model="incomeForm.comment"
            placeholder="Комиссия за выкуп товара с 1688"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-emerald focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showIncomeModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="submitIncome"
          class="px-5 py-2 rounded-xl bg-accent-emerald hover:bg-accent-emerald/90 text-white font-bold text-xs shadow-glow-emerald transition cursor-pointer flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Провести доход</span>
        </button>
      </template>
    </AppModal>

    <!-- 3. Модалка перевода между счетами -->
    <AppModal v-model="showTransferModal" title="Перемещение средств между счетами">
      <div class="space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Счет списания</label>
            <AppDropdown
              v-model="transferForm.sourceAccountId"
              :options="cashAccountOptions"
              class="w-full"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Счет зачисления</label>
            <AppDropdown
              v-model="transferForm.targetAccountId"
              :options="cashAccountOptions"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Сумма перевода ({{ store.activeCurrency }})</label>
          <input
            type="number"
            step="0.01"
            v-model.number="transferForm.amount"
            placeholder="500"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Комментарий</label>
          <input
            v-model="transferForm.comment"
            placeholder="Перевод с кассы ПВЗ на расчетный счет"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showTransferModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="submitTransfer"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Выполнить перевод</span>
        </button>
      </template>
    </AppModal>

    <!-- 4. Модалка заявки на инкассацию -->
    <AppModal v-model="showCollectionModal" title="Инкассация кассы ПВЗ">
      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
          <div class="font-bold">Филиал: {{ selectedCollectionBranch?.name }}</div>
          <div class="text-[11px] text-text-secondary">
            Текущий остаток в кассе: <b class="text-white font-mono">{{ store.formatMoney(selectedCollectionBranch?.cashBalanceUSD || 0) }}</b>
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Сумма инкассации (USD)</label>
          <input
            type="number"
            step="0.01"
            v-model.number="collectionForm.amount"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-amber-400 focus:outline-none font-mono font-bold"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Примечания (Курьер / Сейф-пакет)</label>
          <input
            v-model="collectionForm.notes"
            placeholder="Сейф-пакет №SP-9921, курьер Рахим"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCollectionModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="submitCollectionRequest"
          class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer flex items-center gap-1.5"
        >
          <Wallet class="w-3.5 h-3.5" />
          <span>Сформировать квитанцию</span>
        </button>
      </template>
    </AppModal>

    <!-- 5. Модалка расхода на рейс -->
    <AppModal v-model="showTripExpenseModal" title="Прямой расход на рейс (COGS)">
      <div class="space-y-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Категория логистического расхода</label>
          <AppDropdown
            v-model="tripExpenseForm.category"
            :options="tripExpenseCategoryOptions"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Сумма (USD)</label>
          <input
            type="number"
            step="0.01"
            v-model.number="tripExpenseForm.amount"
            placeholder="1200"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Комментарий</label>
          <input
            v-model="tripExpenseForm.comment"
            placeholder="Оплата за фрахт фуры водителю"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showTripExpenseModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="submitTripExpense"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Добавить расход</span>
        </button>
      </template>
    </AppModal>

    <!-- 6. Модалка погашения долга клиента -->
    <AppModal v-model="showCustomerBalanceModal" title="Погашение задолженности клиента">
      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1">
          <div class="font-bold flex items-center justify-between">
            <span>{{ selectedDebtor?.fullName }}</span>
            <span class="font-mono text-accent-cyan">{{ selectedDebtor?.cargoCode }}</span>
          </div>
          <div class="text-[11px] text-text-secondary">
            Текущий долг: <b class="text-rose-400 font-mono">{{ store.formatMoney(Math.abs(selectedDebtor?.balanceUSD || 0)) }}</b>
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Сумма погашения (USD)</label>
          <input
            type="number"
            step="0.01"
            v-model.number="debtorPaymentAmount"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-emerald-400 focus:outline-none font-mono font-bold"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCustomerBalanceModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="submitDebtorPayment"
          class="px-5 py-2 rounded-xl bg-accent-emerald hover:bg-accent-emerald/90 text-white font-bold text-xs shadow-glow-emerald transition cursor-pointer flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Провести оплату долга</span>
        </button>
      </template>
    </AppModal>

    <!-- 7. Модалка тарифов доставки -->
    <AppModal v-model="showTariffModal" :title="`Настройка тарифов доставки (${store.activeCurrency}/кг)`">
      <div class="space-y-4 text-xs">
        <div class="p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-[11px] leading-relaxed">
          Ставки указываются в вашей активной валюте: <b>{{ store.activeCurrency }}</b>. Все расчеты по посылкам и выдаче производятся в <b>{{ store.activeCurrency }}/кг</b>.
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-text-secondary">Ставка Авто ({{ store.activeCurrency }}/кг)</label>
            <span v-if="store.activeCurrency !== 'USD'" class="text-[10px] text-text-tertiary font-mono">
              ≈ ${{ (tariffForm.autoRatePerKg / (store.ratesToUSD[store.activeCurrency] || 1)).toFixed(2) }} USD/кг
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="tariffForm.autoRatePerKg"
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
          <div class="flex items-center justify-between mb-1">
            <label class="text-text-secondary">Ставка Авиа ({{ store.activeCurrency }}/кг)</label>
            <span v-if="store.activeCurrency !== 'USD'" class="text-[10px] text-text-tertiary font-mono">
              ≈ ${{ (tariffForm.airRatePerKg / (store.ratesToUSD[store.activeCurrency] || 1)).toFixed(2) }} USD/кг
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="tariffForm.airRatePerKg"
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
          <div class="flex items-center justify-between mb-1">
            <label class="text-text-secondary">Минимальная стоимость посылки ({{ store.activeCurrency }})</label>
          </div>
          <input
            v-model.number="tariffForm.minPackageCost"
            type="number"
            step="0.5"
            min="0"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showTariffModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="saveTariffs"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
        >
          Сохранить тарифы
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Wallet,
  Receipt,
  Download,
  ArrowRightLeft,
  FileText,
  Truck,
  Plane,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Check,
  X,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import AppDropdown from '../components/ui/AppDropdown.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();

const toastMessage = ref('');
const isExportMenuOpen = ref(false);
const exportMenuRef = ref<HTMLElement | null>(null);

// Вкладки
const activeTab = ref<'OVERVIEW' | 'CASHBOXES' | 'TRANSACTIONS' | 'TRIPS' | 'DEBTORS'>('OVERVIEW');
const tabs = computed(() => [
  { id: 'OVERVIEW', label: 'Обзор & P&L', icon: TrendingUp },
  { id: 'CASHBOXES', label: 'Кассы и Инкассация', icon: Wallet },
  { id: 'TRANSACTIONS', label: 'Журнал операций', icon: FileText, badge: String(store.financialTransactions.length) },
  { id: 'TRIPS', label: 'Экономика рейсов', icon: Truck, badge: String(store.trips.length) },
  {
    id: 'DEBTORS',
    label: 'Должники',
    icon: Receipt,
    badge: store.financialSummary.debtorsCount > 0 ? String(store.financialSummary.debtorsCount) : undefined,
    badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  },
]);

// 7-дневный график выручки
const chartData = computed(() => {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const totalRev = store.financialSummary.deliveredRevenueUSD;

  return days.map((day, idx) => {
    const isToday = idx === todayIdx;
    const factor = isToday ? 0.35 : idx < todayIdx ? 0.15 : 0.05;
    const amountUSD = Math.round(totalRev * factor * 100) / 100;
    return { day, amountUSD: Math.max(0, amountUSD) };
  });
});

const maxBarAmount = computed(() => {
  const max = Math.max(...chartData.value.map((b) => b.amountUSD), 100);
  return max * 1.1;
});

const chartTotalUSD = computed(() => {
  return chartData.value.reduce((acc, b) => acc + b.amountUSD, 0);
});

// Структура OPEX расходов
const opexCategoryBreakdown = computed(() => {
  const total = store.financialSummary.opexUSD;
  const groups: Record<string, number> = {};

  store.financialTransactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      groups[t.category] = (groups[t.category] || 0) + (t.amountUSD || 0);
    });

  return Object.entries(groups).map(([name, amountUSD]) => ({
    name,
    amountUSD,
    percent: total > 0 ? Math.round((amountUSD / total) * 100) : 0,
  })).sort((a, b) => b.amountUSD - a.amountUSD);
});

// Фильтры транзакций
const txTypeFilter = ref<string>('ALL');
const txTypeFilterOptions = [
  { value: 'ALL', label: 'Все операции' },
  { value: 'EXPENSE', label: 'Расходы' },
  { value: 'INCOME', label: 'Доходы' },
  { value: 'CUSTOMER_PAYMENT', label: 'Оплаты клиентов' },
  { value: 'TRANSFER', label: 'Переводы' },
  { value: 'COLLECTION', label: 'Инкассация' },
];

const filteredTransactions = computed(() => {
  if (txTypeFilter.value === 'ALL') return store.financialTransactions;
  return store.financialTransactions.filter((t) => t.type === txTypeFilter.value);
});

// Опции для выпадающих списков
const cashAccountOptions = computed(() =>
  store.cashAccounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${store.formatMoney(a.balanceUSD)})`,
  }))
);

const expenseCategoryOptions = computed(() =>
  store.expenseCategories.map((c) => ({ value: c.name, label: c.name }))
);

const branchOptionsWithNone = computed(() => [
  { value: '', label: 'Без привязки к филиалу' },
  ...store.branches.map((b) => ({ value: b.id, label: b.name })),
]);

const tripExpenseCategoryOptions = [
  { value: 'Магистральный фрахт (фура/авиа)', label: 'Магистральный фрахт (фура/авиа)' },
  { value: 'Таможенная очистка и пошлины', label: 'Таможенная очистка и пошлины' },
  { value: 'Складская обработка (Иу/Гуанчжоу)', label: 'Складская обработка (Иу/Гуанчжоу)' },
  { value: 'Дорожные и транзитные сборы', label: 'Дорожные и транзитные сборы' },
  { value: 'Прочие прямые расходы', label: 'Прочие прямые расходы' },
];

function getAccountName(id: string) {
  const a = store.cashAccounts.find((x) => x.id === id);
  return a ? a.name : id;
}

function getBranchName(id?: string | null) {
  if (!id) return '';
  const b = store.branches.find((x) => x.id === id);
  return b ? b.name : id;
}

// 1. Внесение расхода
const showExpenseModal = ref(false);
const expenseForm = ref({
  category: 'Аренда складов и ПВЗ',
  amount: 0,
  accountId: '',
  branchId: '',
  comment: '',
});

function openExpenseModal() {
  expenseForm.value = {
    category: store.expenseCategories[0]?.name || 'Прочие расходы',
    amount: 0,
    accountId: store.cashAccounts[0]?.id || '',
    branchId: '',
    comment: '',
  };
  showExpenseModal.value = true;
}

function submitExpense() {
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0) {
    toastMessage.value = 'Укажите корректную сумму расхода';
    return;
  }
  store.addExpense({
    accountId: expenseForm.value.accountId,
    category: expenseForm.value.category,
    amount: expenseForm.value.amount,
    branchId: expenseForm.value.branchId || undefined,
    comment: expenseForm.value.comment,
  });
  showExpenseModal.value = false;
  toastMessage.value = 'Расход успешно проведен';
}

// 2. Внесение дохода
const showIncomeModal = ref(false);
const incomeForm = ref({
  category: 'Доп. услуги / Выкуп товара',
  amount: 0,
  accountId: '',
  comment: '',
});

function openIncomeModal() {
  incomeForm.value = {
    category: 'Доп. услуги / Выкуп товара',
    amount: 0,
    accountId: store.cashAccounts[0]?.id || '',
    comment: '',
  };
  showIncomeModal.value = true;
}

function submitIncome() {
  if (!incomeForm.value.amount || incomeForm.value.amount <= 0) {
    toastMessage.value = 'Укажите корректную сумму дохода';
    return;
  }
  store.addIncome({
    accountId: incomeForm.value.accountId,
    category: incomeForm.value.category,
    amount: incomeForm.value.amount,
    comment: incomeForm.value.comment,
  });
  showIncomeModal.value = false;
  toastMessage.value = 'Доход успешно зачислен';
}

// 3. Перевод между счетами
const showTransferModal = ref(false);
const transferForm = ref({
  sourceAccountId: '',
  targetAccountId: '',
  amount: 0,
  comment: '',
});

function openTransferModal() {
  const accounts = store.cashAccounts;
  transferForm.value = {
    sourceAccountId: accounts[0]?.id || '',
    targetAccountId: accounts[1]?.id || accounts[0]?.id || '',
    amount: 0,
    comment: '',
  };
  showTransferModal.value = true;
}

function submitTransfer() {
  if (!transferForm.value.amount || transferForm.value.amount <= 0) {
    toastMessage.value = 'Укажите сумму для перевода';
    return;
  }
  if (transferForm.value.sourceAccountId === transferForm.value.targetAccountId) {
    toastMessage.value = 'Выберите два разных счета для перевода';
    return;
  }
  store.transferFunds({
    sourceAccountId: transferForm.value.sourceAccountId,
    targetAccountId: transferForm.value.targetAccountId,
    amount: transferForm.value.amount,
    comment: transferForm.value.comment,
  });
  showTransferModal.value = false;
  toastMessage.value = 'Перевод успешно выполнен';
}

// 4. Инкассация
const showCollectionModal = ref(false);
const selectedCollectionBranch = ref<any>(null);
const collectionForm = ref({
  amount: 0,
  notes: '',
});

function openCollectionModal(branchId: string) {
  const branch = store.branches.find((b) => b.id === branchId);
  if (!branch) return;
  selectedCollectionBranch.value = branch;
  collectionForm.value = {
    amount: branch.cashBalanceUSD || 0,
    notes: '',
  };
  showCollectionModal.value = true;
}

function submitCollectionRequest() {
  if (!selectedCollectionBranch.value || collectionForm.value.amount <= 0) return;
  store.requestCashCollection({
    branchId: selectedCollectionBranch.value.id,
    amount: collectionForm.value.amount,
    notes: collectionForm.value.notes,
  });
  showCollectionModal.value = false;
  toastMessage.value = `Заявка на инкассацию сформирована`;
}

function confirmCollection(id: string) {
  store.confirmCashCollection(id);
  toastMessage.value = 'Инкассация подтверждена и зачислена в Главный сейф';
}

function rejectCollection(id: string) {
  store.rejectCashCollection(id, 'Отклонено кассиром');
  toastMessage.value = 'Инкассация отклонена. Деньги возвращены в кассу филиала.';
}

// 5. Расход на рейс (COGS)
const showTripExpenseModal = ref(false);
const selectedTripId = ref('');
const tripExpenseForm = ref({
  category: 'Магистральный фрахт (фура/авиа)',
  amount: 0,
  comment: '',
});

function openTripExpenseModal(tripId: string) {
  selectedTripId.value = tripId;
  tripExpenseForm.value = {
    category: 'Магистральный фрахт (фура/авиа)',
    amount: 0,
    comment: '',
  };
  showTripExpenseModal.value = true;
}

function submitTripExpense() {
  if (!tripExpenseForm.value.amount || tripExpenseForm.value.amount <= 0) return;
  store.addTripExpense({
    tripId: selectedTripId.value,
    category: tripExpenseForm.value.category,
    amount: tripExpenseForm.value.amount,
    comment: tripExpenseForm.value.comment,
  });
  showTripExpenseModal.value = false;
  toastMessage.value = 'Расход на рейс успешно добавлен';
}

// 6. Погашение долга клиента
const showCustomerBalanceModal = ref(false);
const selectedDebtor = ref<any>(null);
const debtorPaymentAmount = ref(0);

function openCustomerBalanceModal(debtor: any) {
  selectedDebtor.value = debtor;
  debtorPaymentAmount.value = Math.abs(debtor.balanceUSD || 0);
  showCustomerBalanceModal.value = true;
}

function submitDebtorPayment() {
  if (!selectedDebtor.value || debtorPaymentAmount.value <= 0) return;
  store.adjustCustomerBalance(selectedDebtor.value.id, debtorPaymentAmount.value, 'Погашение долга в кассе');
  showCustomerBalanceModal.value = false;
  toastMessage.value = `Долг клиента ${selectedDebtor.value.cargoCode} успешно погашен`;
}

// 7. Тарифы доставки
const showTariffModal = ref(false);
const tariffForm = ref({
  autoRatePerKg: 0,
  airRatePerKg: 0,
  minPackageCost: 0,
});

function openTariffModal() {
  tariffForm.value = {
    autoRatePerKg: store.deliveryRates.autoRatePerKg,
    airRatePerKg: store.deliveryRates.airRatePerKg,
    minPackageCost: store.deliveryRates.minPackageCost,
  };
  showTariffModal.value = true;
}

function saveTariffs() {
  store.updateDeliveryRates(tariffForm.value);
  showTariffModal.value = false;
  toastMessage.value = 'Тарифы доставки успешно обновлены';
}

// Экспорт
function triggerExport(type: 'TRANSACTIONS' | 'COLLECTIONS' | 'TRIPS' | 'DEBTORS') {
  isExportMenuOpen.value = false;
  store.exportFinancialReportToCsv(type);
  toastMessage.value = 'Файл CSV успешно сформирован';
}

function handleClickOutside(e: MouseEvent) {
  if (exportMenuRef.value && !exportMenuRef.value.contains(e.target as Node)) {
    isExportMenuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
