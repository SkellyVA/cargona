<template>
  <div v-if="store.hasPermission('customers') && store.isLoyaltyModuleAllowed" class="space-y-6 min-w-0">
    <div>
      <h1 class="text-2xl font-bold text-white">{{ store.loyaltySettings?.clubName || 'NOOR CLUB' }}</h1>
      <p class="mt-2 text-sm text-text-secondary">Кто кого пригласил. Дата — регистрация клиента по приглашению.</p>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-surface border border-surface-border rounded-2xl p-4"><p class="text-sm text-text-secondary">Всего приглашённых</p><p class="text-2xl font-bold text-white">{{ invitations.length }}</p></div>
      <div class="bg-surface border border-surface-border rounded-2xl p-4"><p class="text-sm text-text-secondary">Активных рефералов</p><p class="text-2xl font-bold text-accent-cyan">{{ invitations.filter(row => row.active).length }}</p></div>
    </div>
    <div class="bg-surface border border-surface-border rounded-2xl p-4 space-y-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1 min-w-0">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input v-model="search" type="search" aria-label="Поиск приглашений" placeholder="Имя, код или телефон любого участника" class="w-full h-10 pl-10 pr-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-xs text-white placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan transition" />
        </div>
        <AppDropdown v-model="status" :options="statusOptions" class="w-full sm:w-48" aria-label="Статус реферала" />
      </div>
      <p class="text-xs text-text-secondary">Активный реферал: выдано посылок не менее {{ minimumPackages }}.</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-text-secondary"><tr><th class="p-3">Кто пригласил</th><th class="p-3">Кого пригласили</th><th class="p-3">Дата регистрации</th><th class="p-3">Статус</th></tr></thead>
          <tbody>
            <tr v-for="row in filtered" :key="row.customer.id" class="border-t border-surface-border">
              <td class="p-3 text-white"><div>{{ row.inviter?.fullName || 'Клиент не найден' }}</div><div class="text-xs text-text-secondary">{{ row.inviter?.cargoCode || row.customer.invitedByCustomerId }}</div></td>
              <td class="p-3 text-white"><div>{{ row.customer.fullName }}</div><div class="text-xs text-text-secondary">{{ row.customer.cargoCode }} · {{ row.customer.phone }}</div></td>
              <td class="p-3 whitespace-nowrap text-text-secondary">{{ formatDate(row.customer.createdAt) }}</td>
              <td class="p-3" :class="row.active ? 'text-accent-cyan' : 'text-text-secondary'">{{ row.active ? 'Активный' : 'Неактивный' }}</td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="4" class="p-8 text-center text-text-secondary">{{ invitations.length ? 'Ничего не найдено' : 'Приглашений пока нет' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <p v-else class="text-text-secondary">Раздел недоступен.</p>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCargoStore } from '../stores/useCargoStore';
import { findInviter } from '../utils/referrals.mjs';
import AppDropdown from '../components/ui/AppDropdown.vue';
import { Search } from 'lucide-vue-next';

const store = useCargoStore();
const search = ref('');
const status = ref<string | number>('all');
const statusOptions = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
];
const minimumPackages = computed(() => store.loyaltySettings?.activeReferralMinPackages || 1);
const invitations = computed(() => {
  const delivered = new Map<string, number>();
  for (const pkg of store.packages) {
    if (pkg.status === 'RELEASED') {
      const code = pkg.customerCargoCode.toUpperCase();
      delivered.set(code, (delivered.get(code) || 0) + 1);
    }
  }
  return store.customers.filter(c => c.invitedByCustomerId?.trim()).map(customer => ({
    customer,
    inviter: findInviter(customer, store.customers),
    active: (delivered.get(customer.cargoCode.toUpperCase()) || 0) >= minimumPackages.value,
  })).sort((a, b) => timestamp(b.customer.createdAt) - timestamp(a.customer.createdAt));
});
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return invitations.value.filter(row =>
    (status.value === 'all' || row.active === (status.value === 'active')) &&
    [row.customer.fullName, row.customer.cargoCode, row.customer.phone, row.customer.invitedByCustomerId,
      row.inviter?.fullName, row.inviter?.cargoCode, row.inviter?.phone].some(value => value?.toLocaleLowerCase().includes(query))
  );
});
function timestamp(value?: string) {
  return value ? Date.parse(value) || 0 : 0;
}
function formatDate(value?: string) {
  return timestamp(value) ? new Date(value!).toLocaleString('ru-RU') : 'Дата неизвестна';
}
</script>
