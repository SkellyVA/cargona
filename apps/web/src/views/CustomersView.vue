<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка раздела -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ t('customers.title') }}</h1>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <div class="relative w-full sm:w-64">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            v-model="searchQuery"
            :placeholder="t('customers.searchPlaceholder')"
            class="w-full h-10 pl-10 pr-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-xs text-white placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan transition"
          />
        </div>

        <button
          @click="showCreateCustomerModal = true"
          class="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition shrink-0 cursor-pointer w-full sm:w-auto whitespace-nowrap"
        >
          <Plus class="w-4 h-4" />
          <span>{{ t('customers.addCustomerBtn') }}</span>
        </button>
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

    <!-- Статистика по клиентам -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
          <Users class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">{{ t('customers.totalCustomers') }}</div>
          <div class="text-lg sm:text-2xl font-black text-white mt-0.5">{{ store.customers.length }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
          <PackageCheck class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">В ПВЗ</div>
          <div class="text-lg sm:text-2xl font-black text-accent-cyan mt-0.5">{{ totalReadyPackages }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-coral/15 border border-accent-coral/30 flex items-center justify-center text-accent-coral shrink-0">
          <Receipt class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">Долги</div>
          <div class="text-base sm:text-xl font-black text-accent-coral mt-0.5 truncate">{{ store.formatMoney(totalDebtsUSD) }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-emerald/15 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald shrink-0">
          <Wallet class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">Депозиты</div>
          <div class="text-base sm:text-xl font-black text-accent-emerald mt-0.5 truncate">{{ store.formatMoney(totalDepositsUSD) }}</div>
        </div>
      </div>
    </div>

    <!-- Список / Таблица клиентов -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <!-- 1. МОБИЛЬНЫЙ ВИД: Карточки клиентов -->
      <div class="md:hidden space-y-3">
        <div
          v-for="c in filteredCustomers"
          :key="c.id"
          @click="openCustomerCard(c)"
          class="p-4 rounded-2xl bg-[#181B23] border border-white/[0.06] space-y-3 cursor-pointer hover:border-white/20 transition shadow-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="px-2.5 py-1 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-mono font-bold text-xs">
                {{ c.cargoCode }}
              </span>
              <div class="font-bold text-white text-sm mt-1.5">{{ c.fullName }}</div>
            </div>

            <div class="text-right font-mono font-bold text-sm">
              <span :class="c.balanceUSD < 0 ? 'text-accent-coral' : c.balanceUSD > 0 ? 'text-accent-emerald' : 'text-text-secondary'">
                {{ store.formatMoney(c.balanceUSD) }}
              </span>
              <div class="text-[10px] text-text-tertiary font-sans font-normal">баланс</div>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-text-secondary border-t border-white/[0.04] pt-2">
            <div class="font-mono">{{ c.phone }} <span v-if="c.telegramUsername" class="text-accent-cyan ml-1">@{{ c.telegramUsername }}</span></div>
            <div v-if="getClientReadyCount(c.cargoCode) > 0" class="px-2 py-0.5 rounded-md bg-accent-emerald/20 text-accent-emerald font-bold text-[11px]">
              {{ getClientReadyCount(c.cargoCode) }} шт в ПВЗ
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-white/[0.04] pt-2" @click.stop>
            <button
              @click="copyInviteLink(c)"
              class="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-accent-cyan transition text-xs flex items-center gap-1.5"
            >
              <Send class="w-3.5 h-3.5" />
              <span>Ссылка TG</span>
            </button>
            <button
              @click="openCustomerCard(c)"
              class="px-3 py-1.5 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-cyan font-bold transition text-xs"
            >
              Карточка
            </button>
          </div>
        </div>

        <div v-if="filteredCustomers.length === 0" class="py-12 text-center text-text-tertiary">
          Клиентов не найдено
        </div>
      </div>

      <!-- 2. ДЕСКТОПНЫЙ ВИД: Таблица клиентов -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-white/[0.06] text-text-tertiary font-semibold uppercase tracking-wider">
              <th class="pb-3 px-3">Код</th>
              <th class="pb-3 px-3">Клиент</th>
              <th class="pb-3 px-3">Телефон / Telegram</th>
              <th class="pb-3 px-3">Баланс</th>
              <th class="pb-3 px-3">В ПВЗ</th>
              <th class="pb-3 px-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr
              v-for="c in filteredCustomers"
              :key="c.id"
              @click="openCustomerCard(c)"
              class="hover:bg-white/[0.03] transition cursor-pointer group"
            >
              <!-- Карго-код -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <span class="px-2.5 py-1 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-mono font-bold group-hover:shadow-glow-cyan transition">
                  {{ c.cargoCode }}
                </span>
              </td>

              <!-- ФИО -->
              <td class="py-3.5 px-3 whitespace-nowrap font-bold text-white group-hover:text-accent-cyan transition">
                {{ c.fullName }}
              </td>

              <!-- Контакты -->
              <td class="py-3.5 px-3 whitespace-nowrap text-text-secondary font-mono">
                <div>{{ c.phone }}</div>
                <div v-if="c.telegramUsername" class="text-accent-cyan text-[11px]">@{{ c.telegramUsername }}</div>
              </td>

              <!-- Баланс депозита / долга -->
              <td class="py-3.5 px-3 whitespace-nowrap font-mono font-bold">
                <span :class="c.balanceUSD < 0 ? 'text-accent-coral' : c.balanceUSD > 0 ? 'text-accent-emerald' : 'text-text-secondary'">
                  {{ store.formatMoney(c.balanceUSD) }}
                </span>
              </td>

              <!-- Посылки в ПВЗ -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <span
                  v-if="getClientReadyCount(c.cargoCode) > 0"
                  class="px-2 py-0.5 rounded-md bg-accent-emerald/20 text-accent-emerald font-bold"
                >
                  {{ getClientReadyCount(c.cargoCode) }} шт
                </span>
                <span v-else class="text-text-tertiary">—</span>
              </td>

              <!-- Действия -->
              <td class="py-3.5 px-3 text-right whitespace-nowrap" @click.stop>
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="copyInviteLink(c)"
                    class="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-accent-cyan transition"
                    title="Скопировать ссылку для клиента в Telegram"
                  >
                    <Send class="w-4 h-4" />
                  </button>

                  <button
                    @click="openCustomerCard(c)"
                    class="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white font-medium transition text-xs"
                  >
                    Карточка
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredCustomers.length === 0" class="py-12 text-center text-text-tertiary">
        Клиентов не найдено
      </div>
    </div>

    <!-- Модальное окно: Новый клиент -->
    <AppModal v-model="showCreateCustomerModal" title="Зарегистрировать клиента">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">ФИО клиента</label>
          <input
            v-model="newCustomer.fullName"
            placeholder="Фарух Рахимов"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Номер телефона</label>
          <input
            v-model="newCustomer.phone"
            placeholder="+992 91 888 7766"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Telegram Username (@username)</label>
          <input
            v-model="newCustomer.telegramUsername"
            placeholder="farrukh_tj"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Карго-код</label>
          <input
            v-model="newCustomer.cargoCode"
            :placeholder="`${store.settings.codePrefix}-525`"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono uppercase font-bold"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCreateCustomerModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="createCustomer"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Создать
        </button>
      </template>
    </AppModal>

    <!-- Настоящая карточка клиента с историей и балансом -->
    <CustomerDetailsModal
      v-model="showDetailsModal"
      :customer="selectedCustomer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Search,
  Plus,
  Send,
  X,
  Users,
  PackageCheck,
  Receipt,
  Wallet,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import CustomerDetailsModal from '../components/CustomerDetailsModal.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();
const searchQuery = ref('');
const showCreateCustomerModal = ref(false);
const showDetailsModal = ref(false);
const selectedCustomer = ref<any>(null);
const toastMessage = ref('');

const newCustomer = ref({
  fullName: '',
  phone: '',
  telegramUsername: '',
  cargoCode: store.nextCargoCode(),
});

const filteredCustomers = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return store.customers;
  return store.customers.filter(
    (c) =>
      c.cargoCode.toLowerCase().includes(q) ||
      c.fullName.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.telegramUsername && c.telegramUsername.toLowerCase().includes(q))
  );
});

const totalReadyPackages = computed(() => {
  return store.packages.filter((p) => p.status === 'READY_FOR_PICKUP').length;
});

const totalDebtsUSD = computed(() => {
  return store.customers.filter((c) => c.balanceUSD < 0).reduce((acc, c) => acc + Math.abs(c.balanceUSD), 0);
});

const totalDepositsUSD = computed(() => {
  return store.customers.filter((c) => c.balanceUSD > 0).reduce((acc, c) => acc + c.balanceUSD, 0);
});

function getClientReadyCount(code: string) {
  return store.packages.filter((p) => p.customerCargoCode === code && p.status === 'READY_FOR_PICKUP').length;
}

function createCustomer() {
  if (!newCustomer.value.fullName || !newCustomer.value.cargoCode) return;
  store.addCustomer({
    cargoCode: newCustomer.value.cargoCode.toUpperCase(),
    fullName: newCustomer.value.fullName,
    phone: newCustomer.value.phone || '+992 90 000 0000',
    telegramUsername: newCustomer.value.telegramUsername || '',
  });
  showCreateCustomerModal.value = false;
  toastMessage.value = `Клиент ${newCustomer.value.fullName} зарегистрирован с кодом ${newCustomer.value.cargoCode}`;
  newCustomer.value = {
    fullName: '',
    phone: '',
    telegramUsername: '',
    cargoCode: store.nextCargoCode(),
  };
}

function openCustomerCard(c: any) {
  selectedCustomer.value = c;
  showDetailsModal.value = true;
}

function copyInviteLink(c: any) {
  const botUser = store.settings.botUsername || 'cargonabot';
  const link = `https://t.me/${botUser}?start=c_${c.cargoCode}`;
  navigator.clipboard.writeText(link);
  toastMessage.value = `Персональная ссылка-инвайт скопирована: ${link}`;
}
</script>
