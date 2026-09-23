<template>
  <div class="relative inline-block text-left" ref="dropdownRef">
    <div>
      <button
        type="button"
        @click="isOpen = !isOpen"
        class="inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#181B23] border border-white/[0.08] text-sm font-medium text-white hover:border-white/[0.16] focus:outline-none transition w-full"
      >
        <div class="flex items-center gap-2 truncate">
          <slot name="icon"></slot>
          <span>{{ selectedLabel }}</span>
        </div>
        <ChevronDown
          class="w-4 h-4 text-text-tertiary transition-transform duration-200"
          :class="{ 'rotate-180 text-accent-cyan': isOpen }"
        />
      </button>
    </div>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-2 min-w-[180px] w-full origin-top-right rounded-2xl bg-[#181B23] border border-white/[0.1] shadow-2xl p-1.5 focus:outline-none backdrop-blur-xl"
      >
        <div class="space-y-0.5 max-h-60 overflow-y-auto">
          <button
            v-for="option in options"
            :key="option.value"
            @click="selectOption(option.value)"
            class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition text-left"
            :class="
              modelValue === option.value
                ? 'bg-accent-blue/20 text-accent-cyan'
                : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
            "
          >
            <span>{{ option.label }}</span>
            <Check v-if="modelValue === option.value" class="w-3.5 h-3.5 text-accent-cyan" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

export interface DropdownOption {
  value: string | number;
  label: string;
}

const props = defineProps<{
  modelValue: string | number;
  options: DropdownOption[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
  const found = props.options.find((o) => o.value === props.modelValue);
  return found ? found.label : props.placeholder || 'Выбрать';
});

function selectOption(val: string | number) {
  emit('update:modelValue', val);
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
