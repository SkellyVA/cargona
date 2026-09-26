<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Верхняя сетка: Главный Hero-виджет + Боковые инфо-карты -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Центральный Hero-виджет (2 колонки) -->
      <div class="lg:col-span-2">
        <HeroWidget
          :amount="totalWeightFormatted"
          :label="t('dashboard.totalTonnageTitle')"
          :currencyBadge="t('common.kg')"
          :subtext="heroSubtext"
        />
      </div>

      <!-- Правая колонка: Баланс кассы ПВЗ и Быстрые действия -->
      <div class="space-y-6">
        <!-- Инфо-карта кассы ПВЗ -->
        <div class="bg-surface border border-surface-border rounded-3xl p-5 shadow-card flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-cyan/20 to-accent-blue/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shadow-sm">
              <Wallet class="w-6 h-6" />
            </div>
            <div>
              <div class="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{{ t('dashboard.pvzCashTitle') }}</div>
              <div class="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                <span>{{ store.formatMoney(totalPvzCashUSD) }}</span>
                <span class="w-2 h-2 rounded-full bg-accent-emerald inline-block"></span>
              </div>
            </div>
          </div>
          <router-link :to="`/o/${slug}/branches`" class="p-2 rounded-xl hover:bg-white/[0.06] text-text-tertiary hover:text-white transition cursor-pointer">
            <ChevronRight class="w-5 h-5" />
          </router-link>
        </div>

        <!-- Круглые кнопки действий (Приемка / Выдать по QR / Рейс) -->
        <ActionPills @action="handleAction" />
      </div>
    </div>

    <!-- Раздел: Список посылок с табами -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4 sm:space-y-5">
      <!-- Табы -->
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3 sm:pb-4 gap-2">
        <div class="flex items-center gap-1.5 p-1 bg-[#181B23] border border-white/[0.06] rounded-2xl overflow-x-auto scrollbar-none max-w-[85vw] sm:max-w-full">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer"
            :class="activeTab === tab.id ? 'bg-surface text-white shadow-sm' : 'text-text-secondary hover:text-white'"
          >
            {{ tab.label }} ({{ tab.count }})
          </button>
        </div>

        <div class="text-xs font-mono font-medium text-text-tertiary shrink-0 hidden sm:block">
          {{ filteredPackagesCount }}
        </div>
      </div>

      <!-- Список посылок (топ-15 последних для мгновенной загрузки) -->
      <div class="divide-y divide-white/[0.04]">
        <div
          v-for="pkg in recentPackages"
          :key="pkg.id"
          class="py-3 flex items-center justify-between hover:bg-white/[0.02] px-1 sm:px-2 rounded-xl transition group gap-2.5"
        >
          <!-- Левая часть: Иконка + Трек + Описание -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
              :class="getStatusBadgeClass(pkg.status)"
            >
              <Package class="w-5 h-5" />
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs sm:text-sm font-bold text-white tracking-wide font-mono truncate max-w-[130px] sm:max-w-none">{{ pkg.trackingNumber }}</span>
                <span class="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-white/[0.06] text-accent-cyan font-mono shrink-0">
                  {{ pkg.customerCargoCode || '—' }}
                </span>
              </div>
              <div class="text-[11px] sm:text-xs text-text-secondary mt-0.5 truncate max-w-[170px] sm:max-w-none">
                {{ pkg.description || 'Cargo' }} • {{ pkg.weightKg }} {{ t('common.kg') }}
              </div>
            </div>
          </div>

          <!-- Правая часть: Статус и сумма -->
          <div class="text-right shrink-0">
            <div class="text-xs sm:text-sm font-bold text-white font-mono">
              {{ store.formatMoney(pkg.costUSD) }}
            </div>
            <div class="text-[10px] sm:text-xs font-medium mt-0.5" :class="getStatusTextClass(pkg.status)">
              {{ getStatusLabel(pkg.status) }}
            </div>
          </div>
        </div>

        <div v-if="recentPackages.length === 0" class="py-12 text-center text-text-tertiary text-xs">
          {{ t('dashboard.noPackages') }}
        </div>
      </div>

      <!-- Быстрый переход в полный каталог посылок -->
      <div v-if="filteredPackagesCount > 0" class="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
        <span class="text-text-tertiary">Показано {{ recentPackages.length }} из {{ filteredPackagesCount }} посылок</span>
        <router-link :to="`/o/${slug}/packages`" class="text-accent-cyan hover:underline font-bold flex items-center gap-1">
          <span>Смотреть все в каталоге</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import HeroWidget from '../components/HeroWidget.vue';
import ActionPills from '../components/ActionPills.vue';
import { Wallet, ChevronRight, Package } from 'lucide-vue-next';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const slug = computed(() => (route.params.slug as string) || store.activeTenantSlug || store.tenants[0]?.slug || '');

const totalWeightFormatted = computed(() => {
  let pkgWeight = 0;
  if (store.packages.length > 0) {
    for (let i = 0; i < store.packages.length; i++) {
      pkgWeight += (store.packages[i].weightKg || 0);
    }
    if (typeof window !== 'undefined' && slug.value && pkgWeight > 0) {
      try {
        localStorage.setItem('cargona_tonnage_' + slug.value, pkgWeight.toFixed(2));
      } catch (_) {}
    }
  } else if (typeof window !== 'undefined' && slug.value) {
    const cached = localStorage.getItem('cargona_tonnage_' + slug.value);
    if (cached) {
      pkgWeight = parseFloat(cached) || 0;
    }
  }
  return pkgWeight.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

const totalPvzCashUSD = computed(() => {
  let sum = 0;
  for (const b of store.branches) sum += (b.cashBalanceUSD || 0);
  return sum;
});

const statusCounts = computed(() => {
  let ready = 0;
  let transit = 0;
  let origin = 0;
  for (const p of store.packages) {
    if (p.status === 'READY_FOR_PICKUP') ready++;
    else if (p.status === 'IN_TRANSIT') transit++;
    else if (p.status === 'RECEIVED_AT_ORIGIN') origin++;
  }
  return { ready, transit, origin, all: store.packages.length };
});

const heroSubtext = computed(() => {
  let inTransitTrips = 0;
  for (const t of store.trips) {
    if (t.status === 'IN_TRANSIT') inTransitTrips++;
  }
  return t('dashboard.totalTonnageSubtext', { trips: inTransitTrips, packages: statusCounts.value.ready });
});

const activeTab = ref<'ALL' | 'READY' | 'TRANSIT' | 'ORIGIN'>('ALL');

const tabs = computed(() => [
  { id: 'ALL' as const, label: t('common.all'), count: statusCounts.value.all },
  { id: 'READY' as const, label: t('statuses.READY_FOR_PICKUP'), count: statusCounts.value.ready },
  { id: 'TRANSIT' as const, label: t('statuses.IN_TRANSIT'), count: statusCounts.value.transit },
  { id: 'ORIGIN' as const, label: t('statuses.RECEIVED_AT_ORIGIN'), count: statusCounts.value.origin },
]);

const filteredPackagesCount = computed(() => {
  if (activeTab.value === 'READY') return statusCounts.value.ready;
  if (activeTab.value === 'TRANSIT') return statusCounts.value.transit;
  if (activeTab.value === 'ORIGIN') return statusCounts.value.origin;
  return statusCounts.value.all;
});

const recentPackages = computed(() => {
  if (activeTab.value === 'ALL') {
    return store.packages.slice(0, 15);
  }
  const statusMap: Record<string, string> = {
    READY: 'READY_FOR_PICKUP',
    TRANSIT: 'IN_TRANSIT',
    ORIGIN: 'RECEIVED_AT_ORIGIN',
  };
  const target = statusMap[activeTab.value];
  const list: any[] = [];
  for (const p of store.packages) {
    if (p.status === target) {
      list.push(p);
      if (list.length >= 15) break;
    }
  }
  return list;
});

function getStatusLabel(status: string) {
  const key = `statuses.${status}`;
  return t(key);
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'READY_FOR_PICKUP': return 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald';
    case 'IN_TRANSIT': return 'bg-accent-blue/10 border-accent-blue/30 text-accent-cyan';
    case 'RECEIVED_AT_ORIGIN': return 'bg-white/[0.05] border-white/[0.1] text-text-secondary';
    default: return 'bg-white/[0.05] border-white/[0.1] text-white';
  }
}

function getStatusTextClass(status: string) {
  switch (status) {
    case 'READY_FOR_PICKUP': return 'text-accent-emerald';
    case 'IN_TRANSIT': return 'text-accent-cyan';
    case 'RECEIVED_AT_ORIGIN': return 'text-text-secondary';
    default: return 'text-white';
  }
}

function handleAction(type: 'intake' | 'handover' | 'trip') {
  if (type === 'handover') {
    router.push(`/o/${slug.value}/pvz`);
  } else if (type === 'intake') {
    router.push(`/o/${slug.value}/wms`);
  } else if (type === 'trip') {
    router.push(`/o/${slug.value}/trips`);
  }
}
</script>
