<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-semibold transition cursor-pointer"
      :class="{ 'border-accent-cyan/40 bg-accent-cyan/10': isOpen }"
      :title="currentLocaleOption.name"
    >
      <AppleFlag :countryCode="currentLocaleOption.flagCountryCode" :size="16" />
      <span class="font-mono">{{ currentLocaleOption.code.toUpperCase() }}</span>
      <ChevronDown class="w-3.5 h-3.5 text-text-tertiary transition-transform duration-200" :class="{ 'rotate-180 text-accent-cyan': isOpen }" />
    </button>

    <!-- Выпадающее меню языков -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-44 rounded-2xl bg-[#141722] border border-white/[0.1] shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <div class="text-[10px] uppercase font-mono tracking-wider text-text-tertiary px-3 py-1.5 font-semibold">
        {{ t('header.language') }}
      </div>
      <button
        v-for="lang in availableLocales"
        :key="lang.code"
        @click="selectLanguage(lang.code)"
        class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left"
        :class="locale === lang.code
          ? 'bg-accent-blue text-white font-bold shadow-sm'
          : 'text-text-secondary hover:text-white hover:bg-white/[0.06]'"
      >
        <div class="flex items-center gap-2.5">
          <AppleFlag :countryCode="lang.flagCountryCode" :size="16" />
          <span>{{ lang.nativeName }}</span>
        </div>
        <Check v-if="locale === lang.code" class="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import AppleFlag from './AppleFlag.vue';
import { useI18n, type LocaleCode } from '../../locales';

const { locale, availableLocales, setLocale, t } = useI18n();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const currentLocaleOption = computed(() => {
  return availableLocales.find((l) => l.code === locale.value) || availableLocales[0];
});

function selectLanguage(code: LocaleCode) {
  setLocale(code);
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
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
