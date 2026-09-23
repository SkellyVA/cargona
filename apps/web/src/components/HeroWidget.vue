<template>
  <div class="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-white/[0.08] shadow-card bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#0E2A47] via-[#12151E] to-[#13151B]">
    <!-- Фоновые мягкие блики -->
    <div class="absolute -top-20 -left-20 w-64 h-64 bg-accent-blue/15 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Центральный показатель -->
    <div class="text-center my-2 sm:my-3 relative z-10">
      <div class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
        <span v-if="symbol" class="text-xl sm:text-3xl text-text-secondary font-semibold">{{ symbol }}</span>
        <span class="truncate max-w-[200px] sm:max-w-none">{{ amount }}</span>
      </div>

      <div class="flex items-center justify-center gap-2 mt-2 sm:mt-3 flex-wrap">
        <span class="text-xs font-medium text-text-secondary">{{ label }}</span>
        <span v-if="currencyBadge" class="text-[11px] font-semibold bg-white/[0.07] px-2 py-0.5 rounded-md text-accent-cyan">{{ currencyBadge }}</span>
      </div>

      <div v-if="subtext" class="text-[11px] sm:text-xs text-text-tertiary mt-1.5 sm:mt-2 px-2 leading-relaxed">
        {{ subtext }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    badgeLetter?: string;
    symbol?: string;
    amount?: string;
    label?: string;
    currencyBadge?: string;
    subtext?: string;
  }>(),
  {
    symbol: '',
    amount: '0 кг',
    label: 'Всего перевезено груза',
    currencyBadge: 'кг',
    subtext: '',
  }
);
</script>
