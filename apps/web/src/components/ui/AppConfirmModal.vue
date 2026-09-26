<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-2"
        >
          <div
            v-if="modelValue"
            class="w-full max-w-md bg-[#13151B] border border-white/[0.1] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative"
          >
            <!-- Шапка с векторной иконкой предупреждения -->
            <div class="flex items-start gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <AlertTriangle class="w-5 h-5" />
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="text-base font-bold text-white tracking-tight">
                  {{ title || 'Подтверждение удаления' }}
                </h3>
                <p class="text-xs text-text-tertiary mt-1 leading-relaxed">
                  {{ message }}
                </p>
              </div>

              <button
                type="button"
                @click="close"
                class="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-tertiary hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Блок с названием удаляемого объекта (если указан) -->
            <div
              v-if="itemName"
              class="p-3 rounded-2xl bg-[#181B23] border border-white/[0.06] text-xs font-mono font-bold text-rose-300 truncate"
            >
              {{ itemName }}
            </div>

            <!-- Кнопки действий -->
            <div class="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                @click="close"
                class="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white font-semibold text-xs transition cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="button"
                @click="onConfirm"
                class="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-100 font-bold text-xs shadow-[0_0_15px_rgba(244,63,94,0.2)] flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>{{ confirmText || 'Удалить' }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { AlertTriangle, Trash2, X } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    message?: string;
    itemName?: string;
    confirmText?: string;
  }>(),
  {
    modelValue: false,
    title: 'Подтверждение удаления',
    message: 'Это действие необратимо. Данные будут удалены из системы.',
    itemName: '',
    confirmText: 'Удалить',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function close() {
  emit('update:modelValue', false);
  emit('cancel');
}

function onConfirm() {
  emit('confirm');
  emit('update:modelValue', false);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>
