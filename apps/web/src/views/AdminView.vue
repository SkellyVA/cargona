<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка панели управления Cargona -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">Управление платформой</h1>
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto">
        <div
          v-if="isLimitReached"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-coral/10 border border-accent-coral/30 text-accent-coral text-xs font-semibold"
        >
          <ShieldAlert class="w-4 h-4 shrink-0" />
          <span>Лимит лицензии исчерпан (макс: {{ maxTenantsLimit }})</span>
        </div>

        <button
          v-if="!isLimitReached"
          @click="showCreateTenantModal = true"
          class="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition whitespace-nowrap w-full sm:w-auto cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Подключить карго</span>
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

    <!-- 4 метрики MRR и масштаба бизнеса -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-card flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
          <CreditCard class="w-5 h-5" />
        </div>
        <div>
          <div class="text-[11px] text-text-tertiary font-semibold uppercase">Выручка (MRR)</div>
          <div class="text-xl sm:text-2xl font-black text-white mt-0.5">$548 / мес</div>
          <div class="text-[11px] text-accent-emerald font-medium mt-0.5">+18% за месяц</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-card flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-accent-purple/15 border border-accent-purple/30 flex items-center justify-center text-accent-purple shrink-0">
          <Building2 class="w-5 h-5" />
        </div>
        <div>
          <div class="text-[11px] text-text-tertiary font-semibold uppercase">Компаний</div>
          <div class="text-xl sm:text-2xl font-black text-white mt-0.5">
            {{ tenants.length }}
            <span v-if="maxTenantsLimit" class="text-xs font-normal text-text-tertiary">/ {{ maxTenantsLimit }}</span>
          </div>
          <div v-if="isLimitReached" class="text-[11px] text-accent-coral font-medium mt-0.5">Лимит исчерпан</div>
          <div v-else-if="maxTenantsLimit" class="text-[11px] text-accent-cyan font-medium mt-0.5">Лицензия: макс. {{ maxTenantsLimit }}</div>
          <div v-else class="text-[11px] text-text-secondary mt-0.5">Все активны (Безлимит)</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-card flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
          <Scale class="w-5 h-5" />
        </div>
        <div>
          <div class="text-[11px] text-text-tertiary font-semibold uppercase">Общий тоннаж</div>
          <div class="text-xl sm:text-2xl font-black text-white mt-0.5">142.5 т</div>
          <div class="text-[11px] text-accent-cyan font-medium mt-0.5">За текущий месяц</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-card flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center text-accent-amber shrink-0">
          <Boxes class="w-5 h-5" />
        </div>
        <div>
          <div class="text-[11px] text-text-tertiary font-semibold uppercase">Посылок / сут</div>
          <div class="text-xl sm:text-2xl font-black text-white mt-0.5">1 890 шт</div>
          <div class="text-[11px] text-text-secondary mt-0.5">В 14 городах</div>
        </div>
      </div>
    </div>

    <!-- Таблица подключенных Карго-компаний -->
    <div class="bg-surface border border-surface-border rounded-3xl p-6 shadow-card space-y-4">
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <h3 class="text-base font-bold text-white">Карго-компании</h3>
        <span class="text-xs text-text-tertiary">{{ tenants.length }}</span>
      </div>

      <div class="divide-y divide-white/[0.04]">
        <div
          v-for="t in tenants"
          :key="t.id"
          class="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-2xl transition"
        >
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 border border-accent-cyan/30 flex items-center justify-center font-bold text-accent-cyan text-sm shrink-0">
              {{ t.codePrefix }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">{{ t.name }}</span>
                <span class="text-xs text-text-tertiary font-mono">/o/{{ t.slug }}</span>
                <span v-if="!t.isActive" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-coral/20 text-accent-coral border border-accent-coral/30">Приостановлен</span>
              </div>
              <div class="text-xs text-text-secondary mt-0.5">
                {{ t.planName }} • Логин владельца: <span class="text-white font-mono">{{ t.ownerEmail }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button
              @click="openEditTenant(t)"
              class="p-2 rounded-xl text-text-tertiary hover:text-accent-cyan hover:bg-white/[0.06] transition cursor-pointer"
              title="Настроить компанию / сменить валюту и тариф"
            >
              <SlidersHorizontal class="w-4 h-4" />
            </button>

            <router-link
              :to="`/o/${t.slug}/dashboard`"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              <span>Войти под карго</span>
            </router-link>

            <button
              @click="toggleTenantStatus(t)"
              :class="t.isActive ? 'text-text-tertiary hover:text-accent-coral hover:bg-accent-coral/10' : 'text-accent-coral bg-accent-coral/10'"
              class="p-2 rounded-xl transition cursor-pointer"
              :title="t.isActive ? 'Приостановить' : 'Активировать'"
            >
              <Ban class="w-4 h-4" />
            </button>

            <button
              @click="openDeleteTenant(t)"
              class="p-2 rounded-xl text-text-tertiary hover:text-accent-coral hover:bg-accent-coral/10 transition cursor-pointer"
              title="Удалить организацию"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Секция: Конструктор тарифных планов и Feature Flags -->
    <div class="bg-surface border border-surface-border rounded-3xl p-6 shadow-card space-y-4">
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div>
          <h3 class="text-base font-bold text-white">Тарифные планы SaaS</h3>
          <p class="text-xs text-text-secondary mt-0.5">Управляйте тарифами платформы, лимитами и ценообразованием</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="bg-[#181B23] border rounded-2xl p-5 space-y-4"
          :class="plan.slug === 'pro' ? 'border-accent-cyan/40 shadow-glow-cyan' : 'border-white/[0.06]'"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="text-base font-bold text-white block">{{ plan.name }}</span>
              <button
                @click="openEditPlan(plan)"
                class="text-[10px] text-accent-cyan hover:underline mt-0.5 inline-flex items-center gap-1 cursor-pointer"
              >
                <Pencil class="w-3 h-3" />
                <span>Редактировать</span>
              </button>
            </div>
            <span class="text-lg font-black text-white">${{ plan.priceMonthly }} <span class="text-xs text-text-tertiary font-normal">/ мес</span></span>
          </div>

          <div class="space-y-3 text-xs text-text-secondary border-t border-white/[0.06] pt-3">
            <div class="flex items-center justify-between">
              <span>Лимит посылок:</span>
              <span class="text-white font-semibold">{{ plan.maxPackagesPerMonth === -1 ? 'Безлимит' : plan.maxPackagesPerMonth + ' шт' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Лимит филиалов ПВЗ:</span>
              <span class="text-white font-semibold">{{ plan.maxBranches === -1 ? 'Безлимит' : plan.maxBranches }}</span>
            </div>

            <!-- Интерактивные переключатели функций тарифа -->
            <div class="pt-2 space-y-2 border-t border-white/[0.04]">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-text-secondary">
                  <Bot class="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Свой бот (BYOB)</span>
                </div>
                <AppToggle v-model="plan.features.customBotBYOB" />
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-text-secondary">
                  <Sparkles class="w-3.5 h-3.5 text-accent-purple" />
                  <span>White-label бренд</span>
                </div>
                <AppToggle v-model="plan.features.whiteLabel" />
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-text-secondary">
                  <ScanBarcode class="w-3.5 h-3.5 text-accent-emerald" />
                  <span>Штрихкоды WMS</span>
                </div>
                <AppToggle v-model="plan.features.wmsShelfBarcodes" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно: Подключить карго-компанию -->
    <AppModal v-model="showCreateTenantModal" title="Подключить карго">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Название компании</label>
          <input
            v-model="newTenant.name"
            placeholder="Express Cargo"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">URL slug (/o/...)</label>
          <input
            v-model="newTenant.slug"
            placeholder="express-cargo"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Префикс кода клиентов</label>
          <input
            v-model="newTenant.codePrefix"
            placeholder="EXP"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono uppercase"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Email владельца (Логин)</label>
            <input
              v-model="newTenant.ownerEmail"
              type="email"
              required
              placeholder="owner@express.com"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Пароль для входа</label>
            <input
              v-model="newTenant.ownerPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Тарифный план</label>
          <AppDropdown
            v-model="newTenant.planId"
            :options="planDropdownOptions"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCreateTenantModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="createTenant"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Создать
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Редактирование тарифа SaaS -->
    <AppModal v-model="showEditPlanModal" title="Настройка тарифа SaaS">
      <div v-if="editingPlan" class="space-y-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Название тарифа</label>
          <input
            v-model="editingPlan.name"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-bold"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Абонплата ($/мес)</label>
            <input
              type="number"
              v-model.number="editingPlan.priceMonthly"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Лимит филиалов (-1 = безлимит)</label>
            <input
              type="number"
              v-model.number="editingPlan.maxBranches"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Лимит посылок / месяц (-1 = безлимит)</label>
          <input
            type="number"
            v-model.number="editingPlan.maxPackagesPerMonth"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div class="pt-2 space-y-3 border-t border-white/[0.06]">
          <div class="font-bold text-white text-xs">Включенные функции (Feature Flags):</div>
          <div class="flex items-center justify-between">
            <span class="text-text-secondary">Свой бот Telegram (BYOB):</span>
            <AppToggle v-model="editingPlan.features.customBotBYOB" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-secondary">White-label бренд и домен:</span>
            <AppToggle v-model="editingPlan.features.whiteLabel" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-secondary">WMS штрихкоды ячеек:</span>
            <AppToggle v-model="editingPlan.features.wmsShelfBarcodes" />
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showEditPlanModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="savePlan"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Сохранить тариф
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Редактирование компании (Смена валюты, тарифа, логина) -->
    <AppModal v-model="showEditTenantModal" title="Настройки компании-клиента">
      <div v-if="editingTenant" class="space-y-4 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Название компании</label>
          <input
            v-model="editingTenant.name"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-bold"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">URL slug (/o/...)</label>
            <input
              v-model="editingTenant.slug"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Префикс кодов клиентов</label>
            <input
              v-model="editingTenant.codePrefix"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono uppercase font-bold"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Базовая валюта</label>
            <AppDropdown
              v-model="editingTenant.baseCurrency"
              :options="currencyOptions"
              class="w-full"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Тарифный план</label>
            <AppDropdown
              v-model="editingTenant.planName"
              :options="tenantPlanOptions"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Email владельца (Логин доступа)</label>
          <input
            v-model="editingTenant.ownerEmail"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Пароль владельца</label>
          <input
            v-model="editingTenant.ownerPassword"
            type="text"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showEditTenantModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="saveTenant"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
        >
          Сохранить изменения
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Подтверждение удаления организации -->
    <AppModal v-model="showDeleteTenantModal" title="Удалить организацию">
      <div v-if="tenantToDelete" class="space-y-4 text-xs">
        <div class="p-4 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral space-y-1">
          <div class="font-bold text-sm">Внимание! Необратимое действие</div>
          <p class="text-xs opacity-90">
            Вы собираетесь полностью удалить организацию <strong>«{{ tenantToDelete.name }}»</strong> (/o/{{ tenantToDelete.slug }}).
          </p>
          <p class="text-xs opacity-80 mt-1">
            Все связанные посылки, рейсы, филиалы ПВЗ, склады, клиенты и история аудита этой организации будут удалены.
          </p>
        </div>
      </div>

      <template #footer>
        <button
          @click="showDeleteTenantModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="confirmDeleteTenant"
          class="px-5 py-2 rounded-xl bg-accent-coral hover:bg-accent-coral/90 text-white font-bold text-xs shadow-glow transition cursor-pointer"
        >
          Удалить навсегда
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Plus,
  ExternalLink,
  Ban,
  X,
  CreditCard,
  Building2,
  Scale,
  Boxes,
  Bot,
  Sparkles,
  ScanBarcode,
  SlidersHorizontal,
  Pencil,
  Trash2,
  ShieldAlert,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import AppToggle from '../components/ui/AppToggle.vue';
import AppDropdown from '../components/ui/AppDropdown.vue';
import { useCargoStore } from '../stores/useCargoStore';

const store = useCargoStore();
const showCreateTenantModal = ref(false);
const showEditPlanModal = ref(false);
const showEditTenantModal = ref(false);
const showDeleteTenantModal = ref(false);
const toastMessage = ref('');

const editingPlan = ref<any>(null);
const editingTenant = ref<any>(null);
const tenantToDelete = ref<any>(null);

const plans = computed(() => store.saasPlans);
const tenants = computed(() => store.tenants);
const maxTenantsLimit = computed(() => store.maxTenantsLimit);
const isLimitReached = computed(() => store.isLimitReached);

onMounted(() => {
  store.fetchTenantsFromBackend();
});

const planDropdownOptions = computed(() =>
  store.saasPlans.map((p) => ({
    value: p.slug,
    label: `${p.name} ($${p.priceMonthly}/мес)`,
  }))
);

const tenantPlanOptions = computed(() =>
  store.saasPlans.map((p) => ({
    value: p.name,
    label: `${p.name} ($${p.priceMonthly}/мес)`,
  }))
);

const currencyOptions = [
  { value: 'USD', label: 'USD ($ Доллар США)' },
  { value: 'TJS', label: 'TJS (Сомони Таджикистан)' },
  { value: 'RUB', label: 'RUB (₽ Российский рубль)' },
  { value: 'CNY', label: 'CNY (¥ Китайский юань)' },
  { value: 'UZS', label: 'UZS (Узбекский сум)' },
  { value: 'KGS', label: 'KGS (Киргизский сом)' },
];

const newTenant = ref({
  name: '',
  slug: '',
  codePrefix: '',
  ownerEmail: '',
  ownerPassword: '',
  planId: 'pro',
});

async function createTenant() {
  if (isLimitReached.value) {
    toastMessage.value = `Достигнут лимит лицензии на количество организаций (${maxTenantsLimit.value})`;
    return;
  }
  if (!newTenant.value.name || !newTenant.value.slug || !newTenant.value.ownerEmail || !newTenant.value.ownerPassword) {
    toastMessage.value = 'Заполните все поля, включая email и пароль владельца';
    return;
  }
  const chosenPlan = store.saasPlans.find((p) => p.slug === newTenant.value.planId) || store.saasPlans[0];
  const payload = {
    name: newTenant.value.name.trim(),
    slug: newTenant.value.slug.toLowerCase().trim(),
    codePrefix: newTenant.value.codePrefix.toUpperCase().trim() || 'EXP',
    ownerEmail: newTenant.value.ownerEmail.toLowerCase().trim(),
    ownerPassword: newTenant.value.ownerPassword.trim(),
    planName: chosenPlan.name,
    planId: chosenPlan.slug,
    baseCurrency: 'USD',
    isActive: true,
  };

  // Sync with backend API first
  try {
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (errData?.error) {
        toastMessage.value = errData.error;
        return;
      }
    }
  } catch (e) {
    console.warn('[Admin] Backend sync deferred:', e);
  }

  const created = store.addTenant(payload);

  newTenant.value = {
    name: '',
    slug: '',
    codePrefix: '',
    ownerEmail: '',
    ownerPassword: '',
    planId: 'pro',
  };
  showCreateTenantModal.value = false;
  toastMessage.value = `Компания ${created.name} подключена! Вход владельца: ${created.ownerEmail}`;
}

function openEditPlan(plan: any) {
  editingPlan.value = JSON.parse(JSON.stringify(plan));
  showEditPlanModal.value = true;
}

function savePlan() {
  if (!editingPlan.value) return;
  store.updateSaasPlan(editingPlan.value.id, editingPlan.value);
  showEditPlanModal.value = false;
  toastMessage.value = `Тариф ${editingPlan.value.name} успешно обновлен`;
}

function openEditTenant(tenant: any) {
  editingTenant.value = JSON.parse(JSON.stringify(tenant));
  showEditTenantModal.value = true;
}

async function saveTenant() {
  if (!editingTenant.value) return;
  store.updateTenant(editingTenant.value.id, editingTenant.value);

  try {
    await fetch(`/api/admin/tenants/${editingTenant.value.id || editingTenant.value.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingTenant.value),
    });
  } catch (e) {}

  showEditTenantModal.value = false;
  toastMessage.value = `Параметры компании ${editingTenant.value.name} обновлены (Валюта: ${editingTenant.value.baseCurrency}, Тариф: ${editingTenant.value.planName})`;
}

function openDeleteTenant(t: any) {
  tenantToDelete.value = t;
  showDeleteTenantModal.value = true;
}

async function confirmDeleteTenant() {
  if (!tenantToDelete.value) return;
  const name = tenantToDelete.value.name;
  const idOrSlug = tenantToDelete.value.id || tenantToDelete.value.slug;
  store.deleteTenant(tenantToDelete.value.id);

  try {
    await fetch(`/api/admin/tenants/${idOrSlug}`, {
      method: 'DELETE',
    });
  } catch (e) {}

  showDeleteTenantModal.value = false;
  toastMessage.value = `Организация «${name}» успешно удалена`;
  tenantToDelete.value = null;
}

async function toggleTenantStatus(t: any) {
  store.toggleTenantStatus(t.id);
  try {
    await fetch(`/api/admin/tenants/${t.id || t.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: t.isActive }),
    });
  } catch (e) {}
  toastMessage.value = `Статус ${t.name}: ${t.isActive ? 'Активен' : 'Приостановлен'}`;
}
</script>
