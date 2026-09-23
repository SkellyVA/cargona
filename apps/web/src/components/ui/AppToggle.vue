<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    @click="toggle"
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
    :class="modelValue ? 'bg-accent-blue shadow-glow-blue' : 'bg-white/[0.12]'"
  >
    <span
      aria-hidden="true"
      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
      :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: false,
    disabled: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'change', val: boolean): void;
}>();

function toggle() {
  if (props.disabled) return;
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next);
}
</script>
