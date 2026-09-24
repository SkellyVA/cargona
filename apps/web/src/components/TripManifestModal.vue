<template>
  <AppModal v-model="isOpen" title="Транспортный манифест рейса">
    <div class="space-y-4 text-xs">
      <!-- Документ манифеста на белой подложке (формат A4 / накладная) -->
      <div class="p-2 sm:p-4 bg-[#0B0C10] rounded-2xl border border-white/[0.08] overflow-x-auto">
        <div id="printable-manifest" class="bg-white text-black p-4 sm:p-6 rounded-xl shadow-xl space-y-4 select-all text-xs font-sans min-w-[540px] sm:min-w-0">
          <!-- Шапка накладной -->
          <div class="border-b-2 border-black pb-3 flex items-start justify-between">
            <div>
              <h2 class="text-base font-black uppercase tracking-tight">Cargona Logistics OS</h2>
              <div class="text-[11px] font-semibold text-black/70">Грузовой манифест рейса: {{ trip?.tripCode }}</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-xs">Дата: {{ trip?.departureDate || '15.09.2026' }}</div>
              <div class="text-[10px] text-black/60">Маршрут: {{ trip?.route }}</div>
            </div>
          </div>

          <!-- Параметры транспорта -->
          <div class="grid grid-cols-3 gap-2 bg-black/5 p-3 rounded-lg border border-black/10 text-[11px]">
            <div>
              <span class="text-black/60 block">Транспорт:</span>
              <span class="font-bold">{{ trip?.vehiclePlate }}</span>
            </div>
            <div>
              <span class="text-black/60 block">Водитель:</span>
              <span class="font-bold">{{ trip?.driverName }}</span>
            </div>
            <div>
              <span class="text-black/60 block">Статус рейса:</span>
              <span class="font-bold">{{ trip?.status }}</span>
            </div>
          </div>

          <!-- Итоговые показатели -->
          <div class="grid grid-cols-3 gap-2 text-center border border-black/20 p-2 rounded-lg font-mono">
            <div>Общий вес: <b class="text-sm">{{ (trip?.totalWeightKg || 0).toLocaleString() }} кг</b></div>
            <div>Объем: <b class="text-sm">{{ trip?.totalVolumeM3 || 0 }} м³</b></div>
            <div>Мест/Мешков: <b class="text-sm">{{ trip?.sackCount || 0 }} шт</b></div>
          </div>

          <!-- Таблица мешков / консолидаций (Динамическая) -->
          <div>
            <div class="font-bold text-xs uppercase mb-1">Опись тарных мест (Паллеты / Мешки)</div>
            <table class="w-full text-left border-collapse border border-black/30 text-[10px]">
              <thead>
                <tr class="bg-black/10">
                  <th class="border border-black/30 p-1.5">№ Мешка</th>
                  <th class="border border-black/30 p-1.5">Категория / Описание</th>
                  <th class="border border-black/30 p-1.5">Вес (кг)</th>
                  <th class="border border-black/30 p-1.5">Объем (м³)</th>
                  <th class="border border-black/30 p-1.5">Посылок</th>
                  <th class="border border-black/30 p-1.5">Пломба</th>
                  <th class="border border-black/30 p-1.5 text-center no-print">Действие</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in (trip?.manifestItems || [])" :key="item.id">
                  <td class="border border-black/30 p-1.5 font-mono font-bold">{{ item.sackNumber }}</td>
                  <td class="border border-black/30 p-1.5">
                    <div><b>{{ item.category }}</b></div>
                    <div class="text-[9px] text-black/70">{{ item.description }}</div>
                  </td>
                  <td class="border border-black/30 p-1.5 font-mono">{{ item.weightKg }} кг</td>
                  <td class="border border-black/30 p-1.5 font-mono">{{ item.volumeM3 }} м³</td>
                  <td class="border border-black/30 p-1.5 font-mono">{{ item.packageCount }}</td>
                  <td class="border border-black/30 p-1.5 font-mono font-bold">{{ item.sealNumber }}</td>
                  <td class="border border-black/30 p-1 text-center no-print">
                    <button
                      type="button"
                      @click="deleteManifestItem(item.id)"
                      class="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[9px] cursor-pointer inline-flex items-center justify-center"
                      title="Удалить из манифеста"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!trip?.manifestItems || trip.manifestItems.length === 0">
                  <td colspan="7" class="border border-black/30 p-3 text-center text-black/60 italic">
                    В манифесте пока нет позиций. Добавьте мешки/паллеты ниже.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Подписи сторон -->
          <div class="grid grid-cols-3 gap-4 pt-4 border-t border-black/20 text-[10px]">
            <div>
              <div class="text-black/60">Отправитель (Склад отправления):</div>
              <div class="mt-4 border-b border-black"></div>
            </div>
            <div>
              <div class="text-black/60">Перевозчик (Водитель):</div>
              <div class="mt-4 border-b border-black"></div>
            </div>
            <div>
              <div class="text-black/60">Получатель (ПВЗ):</div>
              <div class="mt-4 border-b border-black"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Форма добавления нового мешка/паллеты в манифест -->
      <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-white font-bold text-xs flex items-center gap-1.5">
            <Plus class="w-3.5 h-3.5 text-accent-cyan" />
            <span>Добавить место в манифест</span>
          </span>
          <span class="text-[10px] text-text-tertiary">Пересчет веса и объема автоматический</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <label class="text-[10px] text-text-tertiary mb-0.5 block">№ Мешка / Паллеты</label>
            <input
              v-model="newItem.sackNumber"
              placeholder="SACK-08815"
              class="w-full h-8 px-2.5 rounded-lg bg-[#181B23] border border-white/[0.08] text-white font-mono text-xs focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-text-tertiary mb-0.5 block">Категория</label>
            <input
              v-model="newItem.category"
              placeholder="Одежда / Текстиль"
              class="w-full h-8 px-2.5 rounded-lg bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-text-tertiary mb-0.5 block">Номер пломбы</label>
            <input
              v-model="newItem.sealNumber"
              placeholder="PL-9925"
              class="w-full h-8 px-2.5 rounded-lg bg-[#181B23] border border-white/[0.08] text-white font-mono text-xs focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-text-tertiary mb-0.5 block">Вес (кг)</label>
            <input
              type="number"
              step="0.1"
              v-model.number="newItem.weightKg"
              placeholder="350"
              class="w-full h-8 px-2.5 rounded-lg bg-[#181B23] border border-white/[0.08] text-white font-mono text-xs focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-text-tertiary mb-0.5 block">Объем (м³)</label>
            <input
              type="number"
              step="0.1"
              v-model.number="newItem.volumeM3"
              placeholder="1.8"
              class="w-full h-8 px-2.5 rounded-lg bg-[#181B23] border border-white/[0.08] text-white font-mono text-xs focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[10px] text-text-tertiary mb-0.5 block">Кол-во посылок</label>
            <input
              type="number"
              v-model.number="newItem.packageCount"
              placeholder="25"
              class="w-full h-8 px-2.5 rounded-lg bg-[#181B23] border border-white/[0.08] text-white font-mono text-xs focus:border-accent-cyan focus:outline-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <input
            v-model="newItem.description"
            placeholder="Краткое описание содержимого..."
            class="flex-1 h-8 px-2.5 rounded-lg bg-[#181B23] border border-white/[0.08] text-white text-xs mr-2 focus:border-accent-cyan focus:outline-none"
          />
          <button
            type="button"
            @click="addManifestItem"
            class="h-8 px-3.5 rounded-lg bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition shrink-0 cursor-pointer"
          >
            + Добавить в рейс
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        @click="isOpen = false"
        class="px-4 py-2.5 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
      >
        Закрыть
      </button>

      <button
        @click="printManifest"
        class="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue flex items-center gap-2 transition cursor-pointer"
      >
        <Printer class="w-4 h-4" />
        <span>Печать манифеста (A4 без лишнего)</span>
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Printer, Plus, X } from 'lucide-vue-next';
import AppModal from './ui/AppModal.vue';
import { useCargoStore } from '../stores/useCargoStore';

const store = useCargoStore();

const props = defineProps<{
  modelValue: boolean;
  trip: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const newItem = ref({
  sackNumber: '',
  category: 'Одежда / Текстиль',
  description: '',
  weightKg: 250,
  volumeM3: 1.2,
  packageCount: 20,
  sealNumber: 'PL-9924',
});

function addManifestItem() {
  if (!props.trip || !newItem.value.sackNumber) return;
  store.addTripManifestItem(props.trip.id, {
    sackNumber: newItem.value.sackNumber,
    category: newItem.value.category,
    description: newItem.value.description || newItem.value.category,
    weightKg: newItem.value.weightKg,
    volumeM3: newItem.value.volumeM3,
    packageCount: newItem.value.packageCount,
    sealNumber: newItem.value.sealNumber,
  });

  const nextNum = (props.trip.manifestItems?.length || 0) + 1;
  newItem.value = {
    sackNumber: `SACK-${String(8815 + nextNum).padStart(5, '0')}`,
    category: 'Одежда / Текстиль',
    description: '',
    weightKg: 300,
    volumeM3: 1.5,
    packageCount: 25,
    sealNumber: `PL-${9924 + nextNum}`,
  };
}

function deleteManifestItem(itemId: string) {
  if (!props.trip) return;
  store.removeTripManifestItem(props.trip.id, itemId);
}

function printManifest() {
  const manifestEl = document.getElementById('printable-manifest');
  if (!manifestEl) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Манифест рейса ${props.trip?.tripCode || ''}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #000; background: #fff; margin: 0; padding: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .no-print { display: none !important; }
          .border-b-2 { border-bottom: 2px solid #000; }
          .border-t { border-top: 1px solid #ccc; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .font-mono { font-family: monospace; }
          .uppercase { text-transform: uppercase; }
          .grid { display: grid; }
          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
          .gap-2 { gap: 8px; }
          .gap-4 { gap: 16px; }
          .p-2 { padding: 8px; }
          .p-3 { padding: 12px; }
          .text-center { text-align: center; }
          .justify-between { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        ${manifestEl.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
</script>
