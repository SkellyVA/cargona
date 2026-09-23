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
        class="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        @click.self="closeOnBackdrop && close()"
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
            class="w-full max-w-lg bg-[#13151B] border border-white/[0.1] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col"
          >
            <!-- Заголовок и кнопка закрытия -->
            <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] shrink-0">
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight truncate pr-2">
                {{ title }}
              </h3>
              <button
                @click="close"
                class="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-text-tertiary hover:text-white transition cursor-pointer shrink-0"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Контент модального окна -->
            <div class="overflow-y-auto flex-1 py-3 pr-1">
              <slot></slot>
            </div>

            <!-- Футер / Кнопки действий -->
            <div v-if="$slots.footer" class="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    closeOnBackdrop?: boolean;
  }>(),
  {
    modelValue: false,
    title: '',
    closeOnBackdrop: true,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'close'): void;
}>();

function close() {
  emit('update:modelValue', false);
  emit('close');
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
