<template>
  <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-card flex items-center justify-around select-none">
    <!-- Кнопка 1: Приемка (Склад) -->
    <button @click="$emit('action', 'intake')" class="group flex flex-col items-center gap-2 focus:outline-none cursor-pointer">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-cyan/15 to-accent-blue/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan group-hover:scale-105 group-hover:border-accent-cyan/60 transition duration-200 shadow-sm">
        <PackagePlus class="w-7 h-7 text-accent-cyan" />
      </div>
      <span class="text-xs font-semibold text-text-secondary group-hover:text-white transition text-center whitespace-nowrap">{{ t('dashboard.actionIntake') }}</span>
    </button>

    <!-- Кнопка 2: Главное действие — Выдать по QR -->
    <button @click="$emit('action', 'handover')" class="group flex flex-col items-center gap-2 focus:outline-none cursor-pointer">
      <div class="w-14 h-14 rounded-2xl bg-accent-blue shadow-glow-blue flex items-center justify-center text-white group-hover:scale-105 group-hover:brightness-110 transition duration-200 border border-accent-cyan/40">
        <QrCode class="w-7 h-7 text-white" />
      </div>
      <span class="text-xs font-bold text-white tracking-tight text-center whitespace-nowrap">{{ t('dashboard.actionIssue') }}</span>
    </button>

    <!-- Кнопка 3: Новый рейс -->
    <button @click="$emit('action', 'trip')" class="group flex flex-col items-center gap-2 focus:outline-none cursor-pointer">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-cyan/15 to-accent-blue/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan group-hover:scale-105 group-hover:border-accent-cyan/60 transition duration-200 shadow-sm">
        <Truck class="w-7 h-7 text-accent-cyan" />
      </div>
      <span class="text-xs font-semibold text-text-secondary group-hover:text-white transition text-center whitespace-nowrap">{{ t('dashboard.actionTrip') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { PackagePlus, QrCode, Truck } from 'lucide-vue-next';
import { useI18n } from '../locales';

const { t } = useI18n();

defineEmits<{
  (e: 'action', type: 'intake' | 'handover' | 'trip'): void;
}>();
</script>
