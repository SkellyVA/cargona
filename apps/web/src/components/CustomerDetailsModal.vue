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
            :placeholder="`Сумма в ${store.activeCurrency}...`"
            class="flex-1 h-9 px-3 rounded-xl bg-[#13151B] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-accent-cyan"
          />
          <button
            @click="applyBalanceChange(true)"
            :disabled="balanceSaving"
            class="px-3 h-9 rounded-xl bg-accent-emerald/20 hover:bg-accent-emerald/30 text-accent-emerald font-bold text-xs transition"
          >
            + Пополнить
          </button>
          <button
            v-if="store.isOwner"
            @click="applyBalanceChange(false)"
            :disabled="balanceSaving"
            class="px-3 h-9 rounded-xl bg-accent-coral/20 hover:bg-accent-coral/30 text-accent-coral font-bold text-xs transition"
          >
            − Начислить услуги
          </button>
        </div>
        <AppDropdown v-model="balanceAccountId" :options="store.cashAccounts.map(a => ({ value: a.id, label: a.name }))" placeholder="Счёт приёма оплаты" class="w-full" />
        <p v-if="balanceError" role="alert" class="text-accent-coral text-xs">{{ balanceError }}</p>
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
      <button v-if="store.isOwner && !customer?.telegramUserId && !customer?.isBlocked" type="button" :disabled="linkLoading" @click="createTelegramLink" class="px-4 py-2.5 rounded-xl bg-accent-cyan/10 text-accent-cyan font-semibold text-xs cursor-pointer disabled:opacity-50">Привязать Telegram</button>
      <button v-if="store.isOwner" type="button" @click="showDeleteConfirm = true; deleteError = ''" class="px-4 py-2.5 rounded-xl bg-accent-coral/10 text-accent-coral hover:bg-accent-coral/20 font-semibold text-xs cursor-pointer">Удалить клиента</button>
      <button
        @click="isOpen = false"
        class="px-4 py-2.5 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
      >
        Закрыть
      </button>
    </template>
  </AppModal>
  <AppModal v-model="showDeleteConfirm" title="Удаление клиента">
    <div class="space-y-3 text-xs">
      <p class="text-white">Удалить клиента {{ customer?.fullName }} ({{ customer?.cargoCode }}) из системы?</p>
      <p class="text-text-secondary">Профиль будет удалён. Посылки, платежи и их история сохранятся. Это действие нельзя отменить.</p>
      <p v-if="deleteError" role="alert" class="text-accent-coral">{{ deleteError }}</p>
    </div>
    <template #footer>
      <button type="button" :disabled="isDeleting" @click="showDeleteConfirm = false" class="px-4 py-2.5 rounded-xl bg-white/[0.04] text-text-secondary text-xs cursor-pointer disabled:opacity-50">Отмена</button>
      <button type="button" :disabled="isDeleting" @click="confirmDeleteCustomer" class="px-4 py-2.5 rounded-xl bg-accent-coral text-white font-semibold text-xs cursor-pointer disabled:opacity-50">{{ isDeleting ? 'Удаление…' : 'Удалить клиента навсегда' }}</button>
    </template>
  </AppModal>
  <AppModal v-model="showTelegramLink" title="Привязка Telegram">
    <div class="space-y-3 text-xs">
      <p>Ссылка даёт доступ к кабинету клиента {{ customer?.cargoCode }}. Передайте её лично клиенту после проверки его личности.</p>
      <p class="text-text-secondary">Действует 30 минут, используется один раз. Новая ссылка отменяет предыдущую. ID, посылки и баланс сохранятся.</p>
      <p v-if="linkError" role="alert" class="text-accent-coral">{{ linkError }}</p>
      <p v-if="telegramLink" class="break-all select-all text-accent-cyan">{{ telegramLink }}</p>
    </div>
    <template #footer>
      <button v-if="telegramLink" type="button" @click="copyTelegramLink" class="px-4 py-2.5 rounded-xl bg-accent-cyan text-bg-primary font-semibold text-xs cursor-pointer">{{ linkCopied ? 'Скопировано' : 'Скопировать ссылку' }}</button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from './ui/AppModal.vue';
import AppDropdown from './ui/AppDropdown.vue';
import { useCargoStore } from '../stores/useCargoStore';

const props = defineProps<{
  modelValue: boolean;
  customer: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'deleted', id: string): void;
}>();

const store = useCargoStore();
const showTelegramLink = ref(false);
const telegramLink = ref('');
const linkError = ref('');
const linkLoading = ref(false);
const linkCopied = ref(false);
watch(() => props.customer?.id, () => { showTelegramLink.value = false; telegramLink.value = ''; linkError.value = ''; });
async function createTelegramLink() {
  if (!props.customer || linkLoading.value) return;
  const customerId = props.customer.id;
  showTelegramLink.value = true;
  telegramLink.value = ''; linkError.value = ''; linkCopied.value = false; linkLoading.value = true;
  try {
    const response = await fetch(`/api/o/${store.activeTenantSlug}/customers/${encodeURIComponent(customerId)}/telegram-link`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Не удалось создать ссылку');
    if (props.customer?.id === customerId) telegramLink.value = data.url;
  } catch (error) { if (props.customer?.id === customerId) linkError.value = error instanceof Error ? error.message : 'Не удалось создать ссылку'; }
  finally { linkLoading.value = false; }
}
async function copyTelegramLink() {
  try { await navigator.clipboard.writeText(telegramLink.value); linkCopied.value = true; }
  catch { linkError.value = 'Не удалось скопировать. Выделите ссылку и скопируйте вручную.'; }
}
const showDeleteConfirm = ref(false);
const isDeleting = ref(false);
const deleteError = ref('');
async function confirmDeleteCustomer() {
  if (!props.customer || isDeleting.value) return;
  isDeleting.value = true;
  deleteError.value = '';
  const id = props.customer.id;
  try {
    await store.deleteCustomer(id);
    showDeleteConfirm.value = false;
    isOpen.value = false;
    emit('deleted', id);
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Не удалось удалить клиента';
  } finally { isDeleting.value = false; }
}
const balanceDelta = ref<number | null>(null);
const balanceSaving = ref(false);
const balanceError = ref('');
const balanceAccountId = ref('');

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

async function applyBalanceChange(isPositive: boolean) {
  if (!balanceDelta.value || !props.customer || balanceSaving.value) return;
  const deltaTJS = isPositive ? Math.abs(balanceDelta.value) : -Math.abs(balanceDelta.value);
  const deltaUSD = Math.round(deltaTJS / (store.ratesToUSD[store.activeCurrency] || 1) * 100) / 100;
  balanceSaving.value = true; balanceError.value = '';
  try {
    const customerId = props.customer.id;
    const result = await store.adjustCustomerBalance(customerId, deltaUSD, isPositive ? 'Ручное пополнение' : 'Начисление за услуги', balanceAccountId.value);
    if (props.customer?.id === customerId) props.customer.balanceUSD = result.customer.balance;
    balanceDelta.value = null;
  } catch (error) { balanceError.value = error instanceof Error ? error.message : 'Не удалось изменить баланс'; }
  finally { balanceSaving.value = false; }
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
