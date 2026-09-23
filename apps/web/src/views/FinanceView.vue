<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка раздела -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ t('finance.title') }}</h1>
        <p class="text-xs text-text-tertiary mt-0.5">{{ t('finance.subtitle') }}</p>
      </div>

      <button
        @click="showTariffModal = true"
        class="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition cursor-pointer w-full sm:w-auto whitespace-nowrap"
      >
        <BadgeDollarSign class="w-4 h-4" />
        <span>{{ t('finance.deliveryRates') }}</span>
      </button>
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

    <!-- 4 финансовых KPI (автоматически рассчитываются в активной валюте!) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-5 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
          <TrendingUp class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] text-text-tertiary font-semibold uppercase truncate">{{ t('finance.totalRevenue') }}</div>
          <div class="text-base sm:text-xl font-black text-white mt-0.5 truncate">{{ store.formatMoney(totalMonthlyRevenueUSD) }}</div>
          <div class="text-[10px] sm:text-[11px] text-accent-emerald font-medium mt-0.5">+14%</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-5 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-accent-emerald/15 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald shrink-0">
          <CircleDollarSign class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] text-text-tertiary font-semibold uppercase truncate">{{ t('finance.netProfit') }}</div>
          <div class="text-base sm:text-xl font-black text-accent-emerald mt-0.5 truncate">{{ store.formatMoney(netProfitUSD) }}</div>
          <div class="text-[10px] sm:text-[11px] text-text-secondary mt-0.5 truncate">Маржа 40%</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-5 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
          <Wallet class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] text-text-tertiary font-semibold uppercase truncate">Касса в сети</div>
          <div class="text-base sm:text-xl font-black text-accent-cyan mt-0.5 truncate">{{ store.formatMoney(totalPvzCashUSD) }}</div>
          <div class="text-[10px] sm:text-[11px] text-text-secondary mt-0.5 truncate">{{ store.branches.length }} филиалов</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-5 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-accent-coral/15 border border-accent-coral/30 flex items-center justify-center text-accent-coral shrink-0">
          <Receipt class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] text-text-tertiary font-semibold uppercase truncate">Долги</div>
          <div class="text-base sm:text-xl font-black text-accent-coral mt-0.5 truncate">{{ store.formatMoney(totalDebtsUSD) }}</div>
          <div class="text-[10px] sm:text-[11px] text-text-secondary mt-0.5 truncate">К получению</div>
        </div>
      </div>
    </div>

    <!-- ГРАФИК ДИНАМИКИ ВЫРУЧКИ И ФИЛЬТР ПО ПВЗ -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-card space-y-4 sm:space-y-5">
      <!-- Переключатель филиалов ПВЗ для динамики -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b border-white/[0.06] pb-3 sm:pb-4">
        <div class="min-w-0">
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
            <span>Динамика выручки · 7 дней</span>
            <span v-if="selectedBranchObj" class="text-[11px] font-normal px-2 py-0.5 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 truncate max-w-[120px]">
              {{ selectedBranchObj.name }}
            </span>
          </h3>
          <p class="text-[11px] sm:text-xs text-text-secondary mt-0.5 truncate">
            {{ selectedBranchObj ? selectedBranchObj.address : 'Все филиалы' }}
          </p>
        </div>

        <div class="shrink-0">
          <div class="text-[10px] sm:text-[11px] text-text-tertiary uppercase font-semibold">Итого за неделю</div>
          <div class="text-sm sm:text-base font-mono font-black text-accent-cyan">
            {{ store.formatMoney(weeklyTotalUSD) }}
          </div>
        </div>
      </div>

      <!-- Кнопки выбора филиала — горизонтальный скролл -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          @click="selectedBranchFilter = 'ALL'"
          class="px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition border cursor-pointer shrink-0"
          :class="selectedBranchFilter === 'ALL'
            ? 'bg-accent-blue text-white border-accent-blue shadow-glow-blue'
            : 'bg-white/[0.04] text-text-secondary border-white/[0.06] hover:text-white hover:bg-white/[0.08]'"
        >
          Все ПВЗ
        </button>

        <button
          v-for="b in store.branches"
          :key="b.id"
          @click="selectedBranchFilter = b.id"
          class="px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition border flex items-center gap-1 cursor-pointer shrink-0"
          :class="selectedBranchFilter === b.id
            ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40 shadow-glow-cyan'
            : 'bg-white/[0.04] text-text-secondary border-white/[0.06] hover:text-white hover:bg-white/[0.08]'"
        >
          <MapPin class="w-3 h-3 shrink-0" />
          <span>{{ b.name }}</span>
        </button>
      </div>

      <!-- Гистограмма с overflow-x-auto — никогда не вылазит за экран -->
      <div class="overflow-x-auto">
        <div class="h-40 sm:h-48 flex items-end justify-between gap-1.5 sm:gap-4 px-1 min-w-[260px]">
          <div
            v-for="bar in chartData"
            :key="bar.day"
            class="flex-1 flex flex-col items-center gap-1 sm:gap-2 group h-full justify-end cursor-pointer min-w-[28px]"
          >
            <!-- Тултип при наведении -->
            <div class="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono font-bold text-accent-cyan whitespace-nowrap bg-black/90 px-1.5 py-0.5 rounded border border-accent-cyan/30 shadow-lg">
              {{ store.formatMoney(bar.amountUSD) }}
            </div>

            <!-- Столбик -->
            <div class="w-full max-w-[36px] sm:max-w-[48px] h-24 sm:h-32 bg-white/[0.04] border border-white/[0.06] rounded-t-lg sm:rounded-t-xl overflow-hidden relative flex items-end p-0.5 group-hover:bg-white/[0.08] transition">
              <div
                class="w-full bg-gradient-to-t from-accent-blue via-accent-cyan to-white/90 rounded-t-md sm:rounded-t-lg transition-all duration-500 shadow-glow-cyan"
                :style="{ height: `${Math.max(6, Math.round((bar.amountUSD / maxBarAmount) * 100))}%` }"
              ></div>
            </div>

            <span class="text-[10px] font-mono font-medium text-text-tertiary group-hover:text-white transition">
              {{ bar.day }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Две колонки: Кассы филиалов и Действующие тарифы -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Кассы филиалов с инкассацией -->
      <div class="bg-surface border border-surface-border rounded-3xl p-6 shadow-card space-y-4">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-2.5">
            <Banknote class="w-5 h-5 text-accent-amber" />
            <div>
              <h3 class="text-base font-bold text-white">Кассы филиалов</h3>
              <p class="text-xs text-text-secondary mt-0.5">Баланс наличных в каждом ПВЗ</p>
            </div>
          </div>
          <span class="text-xs font-mono text-accent-amber font-bold">
            Всего: {{ store.formatMoney(totalPvzCashUSD) }}
          </span>
        </div>

        <div class="space-y-3">
          <div
            v-for="branch in store.branches"
            :key="branch.id"
            class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2"
          >
            <div class="min-w-0 flex-1">
              <div class="font-bold text-white text-xs truncate">{{ branch.name }}</div>
              <div class="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1 truncate">
                <MapPin class="w-3 h-3 shrink-0" />
                <span class="truncate">{{ branch.address }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <div class="text-right">
                <div class="text-[10px] text-text-tertiary">Касса</div>
                <div class="text-sm font-bold text-white font-mono">{{ store.formatMoney(branch.cashBalanceUSD) }}</div>
              </div>

              <button
                @click="collectBranchCash(branch)"
                :disabled="branch.cashBalanceUSD <= 0"
                class="h-9 px-2.5 sm:px-3 rounded-xl bg-accent-amber/15 hover:bg-accent-amber/25 text-amber-300 font-semibold text-xs border border-amber-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Wallet class="w-3.5 h-3.5 shrink-0" />
                <span class="hidden sm:inline">Инкасс.</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Действующие тарифные ставки в выбранной валюте/кг -->
      <div class="bg-surface border border-surface-border rounded-3xl p-6 shadow-card space-y-4">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white">Тарифы доставки</h3>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                {{ store.activeCurrency }}/кг
              </span>
            </div>
            <p class="text-xs text-text-secondary mt-0.5">Ставки доставки грузов в валюте: {{ store.activeCurrency }}</p>
          </div>
          <button
            @click="openTariffModal"
            class="px-3 py-1.5 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-cyan text-xs font-semibold border border-accent-blue/30 transition"
          >
            Изменить ставки
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
                <Truck class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div class="min-w-0">
                <div class="font-bold text-white text-xs sm:text-sm truncate">Авто (Иу → Душанбе)</div>
                <div class="text-text-secondary text-[11px] mt-0.5">10–14 дней</div>
              </div>
            </div>
            <div class="text-sm sm:text-base font-bold text-accent-cyan font-mono shrink-0">{{ store.deliveryRates.formattedAuto }}</div>
          </div>

          <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
                <Plane class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div class="min-w-0">
                <div class="font-bold text-white text-xs sm:text-sm truncate">Авиа (Урумчи → Душанбе)</div>
                <div class="text-text-secondary text-[11px] mt-0.5">3–5 дней</div>
              </div>
            </div>
            <div class="text-base font-bold text-accent-cyan font-mono">{{ store.deliveryRates.formattedAir }}</div>
          </div>

          <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div class="font-bold text-white text-sm">Минимальная стоимость посылки</div>
              <div class="text-text-secondary mt-0.5">Для мелких пакетов</div>
            </div>
            <div class="text-base font-bold text-white font-mono">{{ store.deliveryRates.formattedMinCost }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно изменения тарифов -->
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
            <span v-if="store.activeCurrency !== 'USD'" class="text-[10px] text-text-tertiary font-mono">
              ≈ ${{ (tariffForm.minPackageCost / (store.ratesToUSD[store.activeCurrency] || 1)).toFixed(2) }} USD
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="tariffForm.minPackageCost"
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

      <template #footer>
        <button
          @click="showTariffModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="saveTariffs"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Сохранить тарифы
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  BadgeDollarSign,
  TrendingUp,
  CircleDollarSign,
  Wallet,
  Receipt,
  Banknote,
  Truck,
  Plane,
  X,
  MapPin,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();
const showTariffModal = ref(false);
const toastMessage = ref('');
const selectedBranchFilter = ref<string>('ALL');

const tariffForm = ref({
  autoRatePerKg: 30,
  airRatePerKg: 60,
  minPackageCost: 15,
});

function openTariffModal() {
  tariffForm.value = {
    autoRatePerKg: store.deliveryRates.autoRatePerKg,
    airRatePerKg: store.deliveryRates.airRatePerKg,
    minPackageCost: store.deliveryRates.minPackageCost,
  };
  showTariffModal.value = true;
}

const selectedBranchObj = computed(() => {
  if (selectedBranchFilter.value === 'ALL') return null;
  return store.branches.find((b) => b.id === selectedBranchFilter.value) || null;
});

const totalMonthlyRevenueUSD = computed(() => {
  const pkgSum = store.packages.reduce((acc, p) => acc + p.costUSD, 0);
  const cashSum = store.branches.reduce((acc, b) => acc + b.cashBalanceUSD, 0);
  return pkgSum + cashSum;
});

const currentViewRevenueUSD = computed(() => {
  if (selectedBranchFilter.value === 'ALL') {
    return totalMonthlyRevenueUSD.value;
  }
  const branchPkgs = store.packages.filter((p) => p.branchId === selectedBranchFilter.value);
  const pkgSum = branchPkgs.reduce((acc, p) => acc + p.costUSD, 0);
  const cashSum = selectedBranchObj.value ? selectedBranchObj.value.cashBalanceUSD : 0;
  return pkgSum + cashSum;
});

const netProfitUSD = computed(() => {
  return Math.round(totalMonthlyRevenueUSD.value * 0.4 * 100) / 100;
});

const chartData = computed(() => {
  const base = currentViewRevenueUSD.value / 7;
  return [
    { day: 'Пн', amountUSD: Math.round(base * 0.75) },
    { day: 'Вт', amountUSD: Math.round(base * 0.95) },
    { day: 'Ср', amountUSD: Math.round(base * 1.25) },
    { day: 'Чт', amountUSD: Math.round(base * 0.85) },
    { day: 'Пт', amountUSD: Math.round(base * 1.45) },
    { day: 'Сб', amountUSD: Math.round(base * 1.65) },
    { day: 'Вс', amountUSD: Math.round(base * 1.10) },
  ];
});

const weeklyTotalUSD = computed(() => {
  return chartData.value.reduce((acc, d) => acc + d.amountUSD, 0);
});

const maxBarAmount = computed(() => {
  return Math.max(...chartData.value.map((d) => d.amountUSD), 1);
});

const totalPvzCashUSD = computed(() => {
  return store.branches.reduce((acc, b) => acc + b.cashBalanceUSD, 0);
});

const totalDebtsUSD = computed(() => {
  return store.customers.filter((c) => c.balanceUSD < 0).reduce((acc, c) => acc + Math.abs(c.balanceUSD), 0);
});

function collectBranchCash(b: any) {
  const sum = store.collectBranchCash(b.id);
  toastMessage.value = `Инкассировано ${store.formatMoney(sum)} из кассы ${b.name}`;
}

function saveTariffs() {
  store.updateDeliveryRates(tariffForm.value);
  showTariffModal.value = false;
  toastMessage.value = `Тарифы обновлены: Авто ${store.deliveryRates.formattedAuto}, Авиа ${store.deliveryRates.formattedAir}`;
}
</script>
