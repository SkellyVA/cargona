<template>
  <AppModal v-model="isOpen" :title="`Карточка клиента: ${customer?.cargoCode || ''}`">
    <div v-if="customer" class="space-y-4 text-xs">
      <!-- Верхний профиль клиента -->
      <div class="bg-[#181B23] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-base font-bold text-white">{{ customer.fullName }}</span>
            <span class="px-2 py-0.5 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-mono font-bold">
              {{ customer.cargoCode }}
            </span>
          </div>
          <div class="text-text-secondary mt-1 font-mono flex items-center gap-3">
            <span>{{ customer.phone }}</span>
            <span v-if="customer.telegramUsername" class="text-accent-cyan">@{{ customer.telegramUsername }}</span>
          </div>
        </div>

        <!-- Баланс клиента с индикацией -->
        <div class="text-left sm:text-right">
          <div class="text-[10px] text-text-tertiary uppercase font-semibold">Баланс счета</div>
          <div
            class="text-xl font-black font-mono mt-0.5"
            :class="customer.balanceUSD < 0 ? 'text-accent-coral' : customer.balanceUSD > 0 ? 'text-accent-emerald' : 'text-white'"
          >
            {{ store.formatMoney(customer.balanceUSD) }}
          </div>
          <div class="text-[10px] text-text-tertiary mt-0.5">
            {{ customer.balanceUSD < 0 ? 'Задолженность за доставку' : customer.balanceUSD > 0 ? 'Аванс на балансе' : 'Счет оплачен' }}
          </div>
        </div>
      </div>

      <!-- Быстрое управление балансом (Пополнение / Списание) -->
      <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3.5 space-y-2">
        <div class="font-semibold text-white text-[11px]">Корректировка баланса</div>
        <div class="flex items-center gap-2">
          <input
            type="number"
            v-model.number="balanceDelta"
            placeholder="Сумма в TJS..."
            class="flex-1 h-9 px-3 rounded-xl bg-[#13151B] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-accent-cyan"
          />
          <button
            @click="applyBalanceChange(true)"
            class="px-3 h-9 rounded-xl bg-accent-emerald/20 hover:bg-accent-emerald/30 text-accent-emerald font-bold text-xs transition"
          >
            + Пополнить
          </button>
          <button
            @click="applyBalanceChange(false)"
            class="px-3 h-9 rounded-xl bg-accent-coral/20 hover:bg-accent-coral/30 text-accent-coral font-bold text-xs transition"
          >
            - Списать долг
          </button>
        </div>
      </div>

      <!-- Список всех посылок этого клиента -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-white text-[11px]">Посылки клиента ({{ clientPackages.length }})</span>
          <span class="text-[10px] text-accent-cyan">{{ readyCount }} готовы к выдаче</span>
        </div>

        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <div
            v-for="pkg in clientPackages"
            :key="pkg.id"
            class="bg-[#181B23] border border-white/[0.06] rounded-xl p-2.5 flex items-center justify-between"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-white">{{ pkg.trackingNumber }}</span>
                <span v-if="pkg.shelfLocation" class="text-[10px] text-accent-cyan font-mono px-1.5 py-0.5 rounded bg-accent-cyan/10">
                  {{ pkg.shelfLocation }}
                </span>
              </div>
              <div class="text-[11px] text-text-secondary mt-0.5">
                {{ pkg.description }} • {{ pkg.weightKg }} кг
              </div>
            </div>

            <div class="text-right">
              <div class="font-mono font-bold text-white">{{ store.formatMoney(pkg.costUSD) }}</div>
              <div class="text-[10px] font-semibold" :class="pkg.status === 'READY_FOR_PICKUP' ? 'text-accent-emerald' : 'text-accent-cyan'">
                {{ getStatusLabel(pkg.status) }}
              </div>
            </div>
          </div>

          <div v-if="clientPackages.length === 0" class="text-center py-6 text-text-tertiary">
            У клиента пока нет зарегистрированных посылок
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        @click="isOpen = false"
        class="px-4 py-2.5 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
      >
        Закрыть
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import AppModal from './ui/AppModal.vue';
import { useCargoStore } from '../stores/useCargoStore';

const props = defineProps<{
  modelValue: boolean;
  customer: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const store = useCargoStore();
const balanceDelta = ref<number | null>(null);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const clientPackages = computed(() => {
  if (!props.customer) return [];
  return store.packages.filter((p) => p.customerCargoCode === props.customer.cargoCode);
});

const readyCount = computed(() => {
  return clientPackages.value.filter((p) => p.status === 'READY_FOR_PICKUP').length;
});

function applyBalanceChange(isPositive: boolean) {
  if (!balanceDelta.value || !props.customer) return;
  const deltaTJS = isPositive ? Math.abs(balanceDelta.value) : -Math.abs(balanceDelta.value);
  const deltaUSD = deltaTJS / store.ratesToUSD.TJS;
  store.adjustCustomerBalance(props.customer.id, deltaUSD, isPositive ? 'Ручное пополнение' : 'Списание за услуги');
  balanceDelta.value = null;
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'READY_FOR_PICKUP': return 'В ПВЗ (Готов)';
    case 'IN_TRANSIT': return 'В пути';
    case 'RECEIVED_AT_ORIGIN': return 'В Китае';
    case 'RELEASED': return 'Выдан';
    default: return status;
  }
}
</script>
