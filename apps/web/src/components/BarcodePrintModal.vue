<template>
  <AppModal v-model="isOpen" :title="pkg?.isCell ? 'Печать штрихкода ячейки ПВЗ' : 'Печать этикетки со штрихкодом'">
    <div class="space-y-4 text-xs">
      <!-- Превью термоэтикетки (58x40мм) на светлом фоне для наглядности -->
      <div class="p-6 bg-[#0B0C10] rounded-2xl flex items-center justify-center border border-white/[0.08]">
        <!-- ЭТИКЕТКА ЯЧЕЙКИ ХРАНЕНИЯ -->
        <div
          v-if="pkg?.isCell"
          id="printable-sticker"
          class="w-64 bg-white text-black p-4 rounded-xl shadow-2xl space-y-2 border border-black/10 select-all text-center"
        >
          <div class="flex items-center justify-between border-b border-black/20 pb-1 text-[10px]">
            <span class="font-black uppercase tracking-wider text-black/70">{{ pkg.branchName || 'ПВЗ Cargona' }}</span>
            <span class="font-mono text-black/50">{{ pkg.rack || 'Стеллаж' }}</span>
          </div>

          <div class="py-1">
            <div class="text-[9px] uppercase font-bold text-black/50 tracking-wider">Адресная ячейка хранения</div>
            <div class="text-3xl font-black font-mono tracking-tight text-black mt-0.5">{{ pkg.shelfLocation }}</div>
          </div>

          <!-- Векторный штрихкод Code 128 -->
          <div class="flex flex-col items-center justify-center py-0.5">
            <svg class="w-48 h-12" viewBox="0 0 190 50">
              <rect x="0" y="0" width="190" height="50" fill="white" />
              <g fill="black">
                <rect x="10" y="5" width="3" height="32" />
                <rect x="15" y="5" width="2" height="32" />
                <rect x="20" y="5" width="4" height="32" />
                <rect x="27" y="5" width="1" height="32" />
                <rect x="31" y="5" width="3" height="32" />
                <rect x="37" y="5" width="4" height="32" />
                <rect x="44" y="5" width="2" height="32" />
                <rect x="49" y="5" width="5" height="32" />
                <rect x="57" y="5" width="2" height="32" />
                <rect x="62" y="5" width="3" height="32" />
                <rect x="68" y="5" width="4" height="32" />
                <rect x="75" y="5" width="1" height="32" />
                <rect x="79" y="5" width="3" height="32" />
                <rect x="85" y="5" width="5" height="32" />
                <rect x="93" y="5" width="2" height="32" />
                <rect x="98" y="5" width="4" height="32" />
                <rect x="105" y="5" width="2" height="32" />
                <rect x="110" y="5" width="3" height="32" />
                <rect x="116" y="5" width="1" height="32" />
                <rect x="120" y="5" width="4" height="32" />
                <rect x="127" y="5" width="2" height="32" />
                <rect x="132" y="5" width="5" height="32" />
                <rect x="140" y="5" width="3" height="32" />
                <rect x="146" y="5" width="2" height="32" />
                <rect x="151" y="5" width="4" height="32" />
                <rect x="158" y="5" width="2" height="32" />
                <rect x="163" y="5" width="3" height="32" />
                <rect x="169" y="5" width="2" height="32" />
                <rect x="174" y="5" width="4" height="32" />
              </g>
              <text x="95" y="46" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="black">
                {{ pkg.trackingNumber }}
              </text>
            </svg>
          </div>

          <div class="border-t border-black/20 pt-1 text-[9px] font-mono text-black/60 flex justify-between">
            <span>Cargona WMS Smart Warehouse</span>
            <span>{{ currentDate }}</span>
          </div>
        </div>

        <!-- СТАНДАРТНАЯ ЭТИКЕТКА ПОСЫЛКИ КЛИЕНТА -->
        <div
          v-else
          id="printable-sticker"
          class="w-64 bg-white text-black p-4 rounded-xl shadow-2xl space-y-2 border border-black/10 select-all"
        >
          <!-- Хедер этикетки -->
          <div class="flex items-center justify-between border-b border-black/20 pb-1.5">
            <span class="font-black text-xs tracking-wider uppercase">Cargona • {{ store.settings.companyName }}</span>
            <span class="font-mono text-[10px] text-black/60">{{ currentDate }}</span>
          </div>

          <!-- Крупный код клиента -->
          <div class="text-center py-1 bg-black/5 rounded-lg border border-black/10">
            <div class="text-[9px] uppercase font-bold text-black/60">Код получателя</div>
            <div class="text-2xl font-black font-mono tracking-widest">{{ pkg?.customerCargoCode || `${store.settings.codePrefix}-000` }}</div>
          </div>

          <!-- Векторный штрихкод Code 128 (SVG) -->
          <div class="flex flex-col items-center justify-center py-1">
            <svg class="w-48 h-12" viewBox="0 0 190 50">
              <rect x="0" y="0" width="190" height="50" fill="white" />
              <g fill="black">
                <rect x="10" y="5" width="2" height="32" />
                <rect x="14" y="5" width="4" height="32" />
                <rect x="20" y="5" width="1" height="32" />
                <rect x="24" y="5" width="3" height="32" />
                <rect x="30" y="5" width="2" height="32" />
                <rect x="34" y="5" width="5" height="32" />
                <rect x="42" y="5" width="2" height="32" />
                <rect x="48" y="5" width="3" height="32" />
                <rect x="54" y="5" width="1" height="32" />
                <rect x="58" y="5" width="4" height="32" />
                <rect x="65" y="5" width="2" height="32" />
                <rect x="70" y="5" width="3" height="32" />
                <rect x="76" y="5" width="5" height="32" />
                <rect x="84" y="5" width="2" height="32" />
                <rect x="90" y="5" width="1" height="32" />
                <rect x="94" y="5" width="3" height="32" />
                <rect x="100" y="5" width="4" height="32" />
                <rect x="107" y="5" width="2" height="32" />
                <rect x="112" y="5" width="3" height="32" />
                <rect x="118" y="5" width="2" height="32" />
                <rect x="123" y="5" width="4" height="32" />
                <rect x="130" y="5" width="1" height="32" />
                <rect x="134" y="5" width="5" height="32" />
                <rect x="142" y="5" width="3" height="32" />
                <rect x="148" y="5" width="2" height="32" />
                <rect x="153" y="5" width="3" height="32" />
                <rect x="159" y="5" width="4" height="32" />
                <rect x="166" y="5" width="2" height="32" />
                <rect x="171" y="5" width="1" height="32" />
                <rect x="175" y="5" width="3" height="32" />
              </g>
              <text x="95" y="46" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="black">
                {{ pkg?.trackingNumber }}
              </text>
            </svg>
          </div>

          <!-- Метаданные: Вес и полка хранения -->
          <div class="grid grid-cols-2 gap-1 text-[10px] border-t border-black/20 pt-1.5">
            <div>
              <span class="text-black/60 block">Вес:</span>
              <span class="font-bold text-xs font-mono">{{ pkg?.weightKg }} кг</span>
            </div>
            <div class="text-right">
              <span class="text-black/60 block">Ячейка ПВЗ:</span>
              <span class="font-black text-xs font-mono">{{ pkg?.shelfLocation || 'БЕЗ ПОЛКИ' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="text-text-secondary text-center text-xs">
        Формат печати: стандартный термопринтер 58×40 мм (чистый термо-вывод без интерфейса сайта)
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
        @click="printSticker"
        class="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue flex items-center gap-2 transition cursor-pointer"
      >
        <Printer class="w-4 h-4" />
        <span>Печать ШК (без лишнего)</span>
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Printer } from 'lucide-vue-next';
import AppModal from './ui/AppModal.vue';
import { useCargoStore } from '../stores/useCargoStore';

const store = useCargoStore();

const props = defineProps<{
  modelValue: boolean;
  pkg: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const currentDate = new Date().toLocaleDateString('ru-RU');

function printSticker() {
  const stickerEl = document.getElementById('printable-sticker');
  if (!stickerEl) return;

  const printWindow = window.open('', '_blank', 'width=450,height=450');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Штрихкод ${props.pkg?.trackingNumber || ''}</title>
        <style>
          @page { size: 58mm 40mm; margin: 2mm; }
          body { font-family: monospace, sans-serif; font-size: 10px; color: #000; background: #fff; margin: 0; padding: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .no-print { display: none !important; }
          * { box-sizing: border-box; }
          svg { width: 100%; max-width: 210px; height: auto; display: block; margin: 0 auto; }
          .border-b { border-bottom: 1px solid #aaa; }
          .border-t { border-top: 1px solid #aaa; }
          .font-black { font-weight: 900; }
          .font-bold { font-weight: bold; }
          .font-mono { font-family: monospace; }
          .text-center { text-align: center; }
          .justify-between { display: flex; justify-content: space-between; width: 100%; }
        </style>
      </head>
      <body>
        ${stickerEl.innerHTML}
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
