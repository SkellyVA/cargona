<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка раздела -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">{{ t('audit.title') }}</h1>
        <p class="text-xs text-text-secondary mt-0.5">{{ t('audit.subtitle') }}</p>
      </div>

      <!-- Фильтры: Поиск, Фильтр по филиалу (ПВЗ), Фильтр по событию -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div class="relative w-full sm:w-56">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            v-model="searchQuery"
            :placeholder="t('common.search')"
            class="w-full h-10 pl-10 pr-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-xs text-white placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan transition"
          />
        </div>

        <!-- Фильтр по конкретному ПВЗ -->
        <AppDropdown
          v-model="selectedBranchFilter"
          :options="branchFilterOptions"
          placeholder="Все филиалы"
          class="w-full sm:w-52"
        />

        <!-- Фильтр по типу события -->
        <AppDropdown
          v-model="selectedActionFilter"
          :options="actionFilterOptions"
          placeholder="Все события"
          class="w-full sm:w-44"
        />
      </div>
    </div>

    <!-- Статистика аудита (динамически пересчитывается для выбранного ПВЗ!) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
          <ScrollText class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">Записей</div>
          <div class="text-base sm:text-xl font-black text-white mt-0.5">{{ filteredLogs.length }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-emerald/15 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald shrink-0">
          <QrCode class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">Выдач</div>
          <div class="text-base sm:text-xl font-black text-accent-emerald mt-0.5">{{ countHandovers }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
          <Warehouse class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">Полок</div>
          <div class="text-base sm:text-xl font-black text-accent-cyan mt-0.5">{{ countCellAssigns }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center text-accent-amber shrink-0">
          <Banknote class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">Инкассаций</div>
          <div class="text-base sm:text-xl font-black text-accent-amber mt-0.5">{{ countCashCollects }}</div>
        </div>
      </div>
    </div>

    <!-- Таблица записей аудита с колонкой ПВЗ -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <!-- Десктопная таблица -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-white/[0.06] text-text-tertiary font-semibold uppercase tracking-wider">
              <th class="pb-3 px-3">Время</th>
              <th class="pb-3 px-3">Филиал / ПВЗ</th>
              <th class="pb-3 px-3">Событие</th>
              <th class="pb-3 px-3">Объект</th>
              <th class="pb-3 px-3">Оператор</th>
              <th class="pb-3 px-3">Детали операции</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="hover:bg-white/[0.02] transition"
            >
              <!-- Время -->
              <td class="py-3.5 px-3 whitespace-nowrap font-mono text-text-secondary">
                {{ log.time }}
              </td>

              <!-- Филиал / ПВЗ -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white font-medium text-xs">
                  <MapPin class="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                  <span>{{ log.branchName || 'ПВЗ Душанбе Центр' }}</span>
                </span>
              </td>

              <!-- Событие -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <span
                  class="px-2.5 py-1 rounded-lg font-semibold text-[11px] border inline-block"
                  :class="getBadgeClass(log.action)"
                >
                  {{ log.actionLabel }}
                </span>
              </td>

              <!-- Объект -->
              <td class="py-3.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                {{ log.target }}
              </td>

              <!-- Оператор -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] text-white">
                    {{ log.user.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-text-secondary">{{ log.user }}</span>
                </div>
              </td>

              <!-- Детали -->
              <td class="py-3.5 px-3 text-text-secondary font-mono text-[11px]">
                {{ log.details }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Мобильный вид: карточки аудита -->
      <div class="md:hidden space-y-3">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="bg-[#181B23]/70 p-3.5 rounded-2xl border border-white/[0.06] space-y-2.5"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs text-text-tertiary">{{ log.time }}</span>
            <span
              class="px-2 py-0.5 rounded-lg font-semibold text-[10px] border"
              :class="getBadgeClass(log.action)"
            >
              {{ log.actionLabel }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-2">
            <div class="font-mono font-bold text-white text-sm tracking-wide">
              {{ log.target }}
            </div>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-[11px]">
              <MapPin class="w-3 h-3 text-accent-cyan shrink-0" />
              <span class="truncate max-w-[130px]">{{ log.branchName || 'ПВЗ Душанбе Центр' }}</span>
            </span>
          </div>

          <div class="text-[11px] text-text-secondary font-mono bg-[#13151B] p-2.5 rounded-xl border border-white/[0.04] break-all">
            {{ log.details }}
          </div>

          <div class="flex items-center justify-between text-[11px] text-text-tertiary pt-1 border-t border-white/[0.04]">
            <span class="text-[10px] uppercase tracking-wider">Оператор</span>
            <div class="flex items-center gap-1.5 font-medium text-white">
              <div class="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-[9px]">
                {{ log.user.charAt(0).toUpperCase() }}
              </div>
              <span>{{ log.user }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredLogs.length === 0" class="py-12 text-center text-text-tertiary space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-text-tertiary flex items-center justify-center mx-auto">
          <ShieldAlert class="w-6 h-6" />
        </div>
        <div class="text-xs font-bold text-white">Журнал аудита чист</div>
        <p class="text-[11px] text-text-tertiary max-w-xs mx-auto">
          Все операции сотрудников (приемка грузов, выдача клиентам, инкассация кассы) будут логироваться здесь автоматически.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, MapPin, ScrollText, QrCode, Warehouse, Banknote, ShieldAlert } from 'lucide-vue-next';
import AppDropdown, { DropdownOption } from '../components/ui/AppDropdown.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();
const searchQuery = ref('');
const selectedActionFilter = ref<string>('ALL');
const selectedBranchFilter = ref<string>('ALL');

const branchFilterOptions = computed<DropdownOption[]>(() => [
  { value: 'ALL', label: 'Все филиалы и склад' },
  ...store.branches.map((b) => ({ value: b.id, label: b.name })),
  { value: 'b-origin', label: 'Склад Иу (Китай)' },
]);

const actionFilterOptions: DropdownOption[] = [
  { value: 'ALL', label: 'Все события' },
  { value: 'HANDOVER', label: 'Выдача клиенту' },
  { value: 'INTAKE', label: 'Приемка на склад' },
  { value: 'CELL_ASSIGN', label: 'Назначение полки' },
  { value: 'CASH_COLLECT', label: 'Инкассация' },
  { value: 'STATUS_CHANGE', label: 'Смена статуса' },
];

const filteredLogs = computed(() => {
  return store.auditLogs.filter((l) => {
    const matchBranch =
      selectedBranchFilter.value === 'ALL' || l.branchId === selectedBranchFilter.value;
    const matchAction =
      selectedActionFilter.value === 'ALL' || l.action === selectedActionFilter.value;
    const query = searchQuery.value.toLowerCase().trim();
    const matchQuery =
      !query ||
      l.target.toLowerCase().includes(query) ||
      l.user.toLowerCase().includes(query) ||
      l.details.toLowerCase().includes(query) ||
      (l.branchName && l.branchName.toLowerCase().includes(query)) ||
      l.actionLabel.toLowerCase().includes(query);
    return matchBranch && matchAction && matchQuery;
  });
});

const countHandovers = computed(() => {
  return filteredLogs.value.filter((l) => l.action === 'HANDOVER').length;
});

const countCellAssigns = computed(() => {
  return filteredLogs.value.filter((l) => l.action === 'CELL_ASSIGN').length;
});

const countCashCollects = computed(() => {
  return filteredLogs.value.filter((l) => l.action === 'CASH_COLLECT').length;
});

function getBadgeClass(action: string) {
  switch (action) {
    case 'HANDOVER':
      return 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20';
    case 'CELL_ASSIGN':
      return 'bg-accent-blue/10 text-accent-cyan border-accent-cyan/20';
    case 'INTAKE':
      return 'bg-accent-indigo/10 text-accent-indigo border-accent-indigo/20';
    case 'CASH_COLLECT':
      return 'bg-accent-amber/10 text-accent-amber border-accent-amber/20';
    default:
      return 'bg-white/[0.05] text-text-secondary border-white/[0.08]';
  }
}
</script>
