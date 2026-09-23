<template>
  <label class="inline-flex items-center gap-2.5 cursor-pointer select-none group">
    <div class="relative flex items-center justify-center">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        @change="handleChange"
        class="sr-only peer"
      />
      <div
        class="w-5 h-5 rounded-lg border transition-all duration-200 flex items-center justify-center shrink-0"
        :class="[
          modelValue
            ? 'bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-indigo border-accent-cyan shadow-[0_0_12px_rgba(6,182,212,0.45)] text-white scale-[1.02]'
            : 'bg-[#141720] border-white/[0.18] group-hover:border-accent-cyan/60 group-hover:bg-[#181B26] text-transparent',
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        ]"
      >
        <svg class="w-3.5 h-3.5 stroke-[3] transition-all duration-150" :class="modelValue ? 'scale-100 opacity-100' : 'scale-50 opacity-0'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
    <span v-if="label" class="text-xs font-medium text-white/90 group-hover:text-white transition">
      {{ label }}
    </span>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: false,
    disabled: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

function handleChange(event: Event) {
  if (props.disabled) return;
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
  emit('change', target.checked);
}
</script>
