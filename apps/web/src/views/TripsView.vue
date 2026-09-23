<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка раздела -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ t('trips.title') }}</h1>
      </div>

      <button
        @click="showCreateTripModal = true"
        class="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition cursor-pointer w-full sm:w-auto whitespace-nowrap"
      >
        <Plus class="w-4 h-4" />
        <span>{{ t('trips.createTripBtn') }}</span>
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

    <!-- Сводные показатели по рейсам -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-cyan shrink-0">
          <Truck class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">{{ t('trips.inTransitStat') }}</div>
          <div class="text-lg sm:text-xl font-black text-white mt-0.5">{{ tripsInTransitCount }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
          <Scale class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">{{ t('trips.totalTonnageStat') }}</div>
          <div class="text-lg sm:text-xl font-black text-accent-cyan mt-0.5">{{ (totalTonnage / 1000).toFixed(1) }} т</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center text-accent-amber shrink-0">
          <Clock class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">{{ t('trips.customsStat') }}</div>
          <div class="text-lg sm:text-xl font-black text-accent-amber mt-0.5">{{ tripsInCustomsCount }}</div>
        </div>
      </div>

      <div class="bg-surface border border-surface-border rounded-2xl p-3 sm:p-4 shadow-card flex items-center gap-2.5 sm:gap-3.5">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-emerald/15 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald shrink-0">
          <CheckCircle2 class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] sm:text-[11px] font-semibold text-text-tertiary uppercase truncate">{{ t('trips.arrivedStat') }}</div>
          <div class="text-lg sm:text-xl font-black text-accent-emerald mt-0.5">{{ tripsArrivedCount }}</div>
        </div>
      </div>
    </div>

    <!-- Список рейсов -->
    <div class="space-y-4">
      <div v-if="store.trips.length === 0" class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-card">
        <div class="w-16 h-16 rounded-3xl bg-accent-blue/15 border border-accent-blue/30 text-accent-cyan flex items-center justify-center mx-auto">
          <Truck class="w-8 h-8" />
        </div>
        <div class="space-y-1 max-w-sm mx-auto">
          <h3 class="text-base sm:text-lg font-bold text-white">Рейсы еще не созданы</h3>
          <p class="text-xs text-text-tertiary">
            Формируйте рейсы (Авто / Авиа / ЖД) для массовой отправки посылок со складов консолидации в пункты выдачи.
          </p>
        </div>
        <button
          @click="showCreateTripModal = true"
          class="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue inline-flex items-center gap-2 transition cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Сформировать первый рейс</span>
        </button>
      </div>

      <div
        v-for="trip in store.trips"
        :key="trip.id"
        class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4 hover:border-white/[0.12] transition"
      >
        <!-- Верхняя полоса рейса -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start sm:items-center gap-3">
            <div
              class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 transition"
              :class="getTripTypeStyles(trip.type)"
            >
              <component :is="getTripTypeIcon(trip.type)" class="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span class="text-sm sm:text-base font-bold text-white font-mono">{{ trip.tripCode }}</span>
                <span
                  class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0"
                  :class="getTripTypeStyles(trip.type)"
                >
                  {{ getTripTypeLabel(trip.type) }}
                </span>
                <span
                  class="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                  :class="getStatusBadgeClass(trip.status)"
                >
                  {{ getStatusLabel(trip.status) }}
                </span>
              </div>
              <div class="text-xs text-text-secondary mt-0.5 truncate">
                {{ trip.route }} • {{ trip.vehiclePlate }} ({{ trip.driverName }})
              </div>
            </div>
          </div>

          <!-- Действия и СМЕНА СТАТУСА РЕЙСА -->
          <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0">
            <!-- Селектор статуса рейса -->
            <AppDropdown
              :modelValue="trip.status"
              @update:modelValue="(newStatus) => changeTripStatus(trip, newStatus as any)"
              :options="tripStatusOptions"
              class="flex-1 sm:flex-initial sm:w-36 min-w-[110px]"
            />

            <!-- Кнопка быстрой погрузки товара в рейс -->
            <button
              @click="openAddPackageToTrip(trip)"
              class="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-xs font-bold text-accent-cyan border border-accent-cyan/30 transition cursor-pointer whitespace-nowrap"
              title="Погрузить товар"
            >
              <PackagePlus class="w-3.5 h-3.5 shrink-0" />
              <span class="hidden sm:inline">Погрузить</span>
            </button>

            <!-- Кнопка манифеста -->
            <button
              @click="openManifest(trip)"
              class="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-text-secondary hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              <FileText class="w-3.5 h-3.5 shrink-0" />
              <span class="hidden sm:inline">Манифест</span>
            </button>
          </div>
        </div>

        <!-- Метрики рейса: Вес, Мешки, Объем -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/[0.04]">
          <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-2.5">
            <Scale class="w-4 h-4 text-text-tertiary shrink-0" />
            <div>
              <div class="text-[10px] text-text-tertiary uppercase font-semibold">Вес груза</div>
              <div class="text-sm font-bold text-white font-mono mt-0.5">{{ trip.totalWeightKg.toLocaleString() }} кг</div>
            </div>
          </div>
          <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-2.5">
            <Boxes class="w-4 h-4 text-text-tertiary shrink-0" />
            <div>
              <div class="text-[10px] text-text-tertiary uppercase font-semibold">Объем</div>
              <div class="text-sm font-bold text-white font-mono mt-0.5">{{ trip.totalVolumeM3 }} м³</div>
            </div>
          </div>
          <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-2.5">
            <Package class="w-4 h-4 text-text-tertiary shrink-0" />
            <div>
              <div class="text-[10px] text-text-tertiary uppercase font-semibold">Мешков / Паллет</div>
              <div class="text-sm font-bold text-white font-mono mt-0.5">{{ trip.sackCount }} шт</div>
            </div>
          </div>
          <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-2.5">
            <Calendar class="w-4 h-4 text-text-tertiary shrink-0" />
            <div>
              <div class="text-[10px] text-text-tertiary uppercase font-semibold">Ориентир прибытия</div>
              <div class="text-sm font-bold text-white font-mono mt-0.5">{{ trip.estimatedArrival }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно: Создать рейс -->
    <AppModal v-model="showCreateTripModal" title="Создать рейс">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1.5 block">Тип перевозки / Транспорт</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              type="button"
              @click="newTrip.type = 'AUTO'"
              class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer"
              :class="newTrip.type === 'AUTO' ? 'bg-accent-blue/20 border-accent-blue text-white shadow-sm' : 'bg-[#181B23] border-white/[0.08] text-text-secondary hover:text-white'"
            >
              <Truck class="w-5 h-5 text-accent-blue" />
              <span class="text-[11px] font-bold">Авто</span>
            </button>

            <button
              type="button"
              @click="newTrip.type = 'AIR'"
              class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer"
              :class="newTrip.type === 'AIR' ? 'bg-accent-cyan/20 border-accent-cyan text-white shadow-sm' : 'bg-[#181B23] border-white/[0.08] text-text-secondary hover:text-white'"
            >
              <Plane class="w-5 h-5 text-accent-cyan" />
              <span class="text-[11px] font-bold">Авиа</span>
            </button>

            <button
              type="button"
              @click="newTrip.type = 'TRAIN'"
              class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer"
              :class="newTrip.type === 'TRAIN' ? 'bg-accent-amber/20 border-accent-amber text-white shadow-sm' : 'bg-[#181B23] border-white/[0.08] text-text-secondary hover:text-white'"
            >
              <Train class="w-5 h-5 text-accent-amber" />
              <span class="text-[11px] font-bold">Ж/Д</span>
            </button>

            <button
              type="button"
              @click="newTrip.type = 'SEA'"
              class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer"
              :class="newTrip.type === 'SEA' ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm' : 'bg-[#181B23] border-white/[0.08] text-text-secondary hover:text-white'"
            >
              <Ship class="w-5 h-5 text-emerald-400" />
              <span class="text-[11px] font-bold">Море</span>
            </button>
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Номер рейса / Код</label>
          <input
            v-model="newTrip.tripCode"
            placeholder="AUTO-2026-45"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Маршрут</label>
          <input
            v-model="newTrip.route"
            placeholder="Иу (Китай) → Душанбе Центр"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Гос. номер авто</label>
            <input
              v-model="newTrip.vehiclePlate"
              placeholder="01 888 TJ"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Водитель</label>
            <input
              v-model="newTrip.driverName"
              placeholder="Мухаммад А."
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Вес груза (кг)</label>
            <input
              type="number"
              v-model.number="newTrip.totalWeightKg"
              placeholder="14500"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Кол-во мешков</label>
            <input
              type="number"
              v-model.number="newTrip.sackCount"
              placeholder="38"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showCreateTripModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="createTrip"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Отправить рейс
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Погрузка товаров в рейс (со сканером ШК) -->
    <AppModal v-model="showAddPackageTripModal" :title="`Погрузка товаров в рейс: ${targetTripForLoading?.tripCode || ''}`">
      <div class="space-y-4 text-xs">
        <!-- Сводка по рейсу -->
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Маршрут рейса</div>
            <div class="font-bold text-white text-sm mt-0.5">{{ targetTripForLoading?.route }}</div>
            <div class="text-[11px] text-text-secondary mt-0.5">{{ targetTripForLoading?.vehiclePlate }} ({{ targetTripForLoading?.driverName }})</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Погружено</div>
            <div class="font-mono font-bold text-accent-cyan text-sm mt-0.5">{{ targetTripForLoading?.totalWeightKg.toLocaleString() }} кг</div>
            <div class="text-[10px] text-text-tertiary font-mono">{{ targetTripForLoading?.totalVolumeM3 }} м³ • {{ packagesLoadedInTrip.length }} посылок</div>
          </div>
        </div>

        <!-- Поле быстрого сканирования ШК для добавления в рейс -->
        <div class="p-3.5 rounded-2xl bg-[#181B23] border border-accent-cyan/30 space-y-2">
          <label class="text-white font-bold text-xs flex items-center gap-1.5">
            <ScanBarcode class="w-4 h-4 text-accent-cyan" />
            <span>Сканировать ШК / трек для немедленной погрузки в рейс:</span>
          </label>

          <div class="flex items-center gap-2">
            <input
              v-model="packageBarcodeScan"
              @keyup.enter="scanAndLoadPackage"
              placeholder="Отсканируйте ШК посылки (например, ZTO482910482)..."
              class="flex-1 h-10 px-3 rounded-xl bg-black/40 border border-white/[0.1] text-white font-mono text-xs focus:border-accent-cyan focus:outline-none"
            />
            <button
              type="button"
              @click="scanAndLoadPackage"
              class="h-10 px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Погрузить</span>
            </button>
          </div>
        </div>

        <!-- Табы: Доступные на складе / Уже в рейсе -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-semibold text-text-tertiary border-b border-white/[0.06] pb-2">
            <span>Доступные к отправке посылки со склада ({{ availablePackagesToLoad.length }} шт.):</span>
            <span class="text-accent-cyan font-mono">1 клик для погрузки</span>
          </div>

          <!-- Список доступных посылок -->
          <div v-if="availablePackagesToLoad.length > 0" class="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            <div
              v-for="pkg in availablePackagesToLoad"
              :key="pkg.id"
              class="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] flex items-center justify-between transition"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-white text-xs">{{ pkg.trackingNumber }}</span>
                  <span class="px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan text-[10px] font-mono font-bold">{{ pkg.customerCargoCode }}</span>
                </div>
                <div class="text-[11px] text-text-secondary mt-0.5">{{ pkg.description }} • {{ pkg.weightKg }} кг</div>
              </div>

              <button
                type="button"
                @click="loadPackage(pkg)"
                class="px-3 py-1.5 rounded-lg bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-cyan font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus class="w-3 h-3" />
                <span>В рейс</span>
              </button>
            </div>
          </div>

          <div v-else class="p-4 text-center text-text-tertiary text-xs bg-white/[0.02] rounded-xl border border-white/[0.04]">
            Все зарегистрированные посылки уже распределены по рейсам.
          </div>
        </div>

        <!-- Посылки, уже находящиеся в этом рейсе -->
        <div v-if="packagesLoadedInTrip.length > 0" class="pt-2 border-t border-white/[0.06] space-y-2">
          <div class="text-[11px] font-semibold text-text-tertiary">
            Погружено в этот рейс ({{ packagesLoadedInTrip.length }} шт.):
          </div>

          <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            <div
              v-for="pkg in packagesLoadedInTrip"
              :key="pkg.id"
              class="p-2 rounded-xl bg-accent-blue/[0.06] border border-accent-cyan/20 flex items-center justify-between"
            >
              <div>
                <span class="font-mono font-bold text-white text-xs">{{ pkg.trackingNumber }}</span>
                <span class="text-text-tertiary text-[11px] ml-2">({{ pkg.customerCargoCode }} • {{ pkg.weightKg }} кг)</span>
              </div>

              <button
                type="button"
                @click="unloadPackage(pkg)"
                class="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-rose-400 text-[10px] font-bold transition cursor-pointer"
                title="Снять посылку с рейса"
              >
                ✕ Снять
              </button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showAddPackageTripModal = false"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
        >
          Готово
        </button>
      </template>
    </AppModal>

    <!-- Настоящее модальное окно грузового манифеста рейса -->
    <TripManifestModal
      v-model="showManifestModal"
      :trip="selectedTripForManifest"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Truck,
  Plane,
  Train,
  Ship,
  Plus,
  FileText,
  X,
  Scale,
  Clock,
  CheckCircle2,
  Boxes,
  Package,
  Calendar,
  PackagePlus,
  ScanBarcode,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import AppDropdown from '../components/ui/AppDropdown.vue';
import TripManifestModal from '../components/TripManifestModal.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();
const showCreateTripModal = ref(false);
const showManifestModal = ref(false);
const showAddPackageTripModal = ref(false);
const targetTripForLoading = ref<any>(null);
const packageBarcodeScan = ref('');
const toastMessage = ref('');
const selectedTripForManifest = ref<any>(null);

function getTripTypeIcon(type?: string) {
  switch (type) {
    case 'AIR':
      return Plane;
    case 'TRAIN':
      return Train;
    case 'SEA':
      return Ship;
    case 'AUTO':
    default:
      return Truck;
  }
}

function getTripTypeStyles(type?: string) {
  switch (type) {
    case 'AIR':
      return 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan';
    case 'TRAIN':
      return 'bg-accent-amber/15 border-accent-amber/30 text-accent-amber';
    case 'SEA':
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
    case 'AUTO':
    default:
      return 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue';
  }
}

function getTripTypeLabel(type?: string) {
  switch (type) {
    case 'AIR':
      return t('transportTypes.AIR');
    case 'TRAIN':
      return t('transportTypes.TRAIN');
    case 'SEA':
      return t('transportTypes.SEA');
    case 'AUTO':
    default:
      return t('transportTypes.AUTO');
  }
}

const tripStatusOptions = [
  { value: 'LOADING', label: 'Погрузка' },
  { value: 'IN_TRANSIT', label: 'В пути' },
  { value: 'CUSTOMS', label: 'Таможня' },
  { value: 'ARRIVED', label: 'Прибыл на ПВЗ' },
  { value: 'COMPLETED', label: 'Завершен' },
];

const newTrip = ref({
  type: 'AUTO' as 'AUTO' | 'AIR' | 'TRAIN' | 'SEA',
  tripCode: '',
  route: '',
  driverName: '',
  vehiclePlate: '',
  totalWeightKg: 15000,
  sackCount: 35,
});

const tripsInTransitCount = computed(() => store.trips.filter((t) => t.status === 'IN_TRANSIT').length);
const tripsInCustomsCount = computed(() => store.trips.filter((t) => t.status === 'CUSTOMS').length);
const tripsArrivedCount = computed(() => store.trips.filter((t) => t.status === 'ARRIVED').length);
const totalTonnage = computed(() => store.trips.reduce((acc, t) => acc + t.totalWeightKg, 0));

// Посылки, доступные для погрузки (на складе отправления или без назначенного рейса)
const availablePackagesToLoad = computed(() => {
  return store.packages.filter((p) => (!p.tripId || p.status === 'RECEIVED_AT_ORIGIN') && p.status !== 'RELEASED' && p.status !== 'RETURNED');
});

// Посылки, уже привязанные к активному рейсу
const packagesLoadedInTrip = computed(() => {
  if (!targetTripForLoading.value) return [];
  return store.packages.filter((p) => p.tripId === targetTripForLoading.value.id);
});

function openAddPackageToTrip(trip: any) {
  targetTripForLoading.value = trip;
  packageBarcodeScan.value = '';
  showAddPackageTripModal.value = true;
}

function scanAndLoadPackage() {
  const code = packageBarcodeScan.value.trim();
  if (!code || !targetTripForLoading.value) return;

  const ok = store.addPackageToTrip(targetTripForLoading.value.id, code);
  if (ok) {
    toastMessage.value = `Посылка ${code} успешно погружена в рейс ${targetTripForLoading.value.tripCode}`;
    packageBarcodeScan.value = '';
  } else {
    toastMessage.value = `Посылка со штрихкодом "${code}" не найдена в базе данных`;
  }
}

function loadPackage(pkg: any) {
  if (!targetTripForLoading.value) return;
  store.addPackageToTrip(targetTripForLoading.value.id, pkg.id);
  toastMessage.value = `Посылка ${pkg.trackingNumber} погружена в рейс ${targetTripForLoading.value.tripCode}`;
}

function unloadPackage(pkg: any) {
  if (!targetTripForLoading.value) return;
  store.removePackageFromTrip(targetTripForLoading.value.id, pkg.id);
  toastMessage.value = `Посылка ${pkg.trackingNumber} снята с рейса`;
}

function createTrip() {
  if (!newTrip.value.tripCode) return;
  store.addTrip({
    type: newTrip.value.type || 'AUTO',
    tripCode: newTrip.value.tripCode,
    route: newTrip.value.route || 'Иу → Душанбе',
    driverName: newTrip.value.driverName || 'Водитель',
    vehiclePlate: newTrip.value.vehiclePlate || '01 000 TJ',
    status: 'IN_TRANSIT',
    totalWeightKg: newTrip.value.totalWeightKg,
    totalVolumeM3: 75.0,
    sackCount: newTrip.value.sackCount,
    departureDate: '21.09.2026',
    estimatedArrival: '28.09.2026',
    manifestItems: [],
  });
  showCreateTripModal.value = false;
  toastMessage.value = `Рейс ${newTrip.value.tripCode} успешно создан`;
  newTrip.value = { type: 'AUTO', tripCode: '', route: '', driverName: '', vehiclePlate: '', totalWeightKg: 15000, sackCount: 35 };
}

function changeTripStatus(trip: any, newStatus: any) {
  store.updateTripStatus(trip.id, newStatus);
  toastMessage.value = `Статус рейса ${trip.tripCode} изменен на ${getStatusLabel(newStatus)}. Посылки синхронизированы.`;
}

function openManifest(trip: any) {
  selectedTripForManifest.value = trip;
  showManifestModal.value = true;
}

function getStatusLabel(status: string) {
  const key = `statuses.${status}`;
  return t(key);
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'IN_TRANSIT': return 'bg-accent-blue/15 border-accent-blue/30 text-accent-cyan';
    case 'CUSTOMS': return 'bg-accent-amber/15 border-accent-amber/30 text-accent-amber';
    case 'ARRIVED': return 'bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald';
    default: return 'bg-white/[0.05] border-white/[0.1] text-text-secondary';
  }
}
</script>
