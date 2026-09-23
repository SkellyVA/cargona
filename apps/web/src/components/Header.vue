<template>
  <header class="h-16 px-4 sm:px-6 border-b border-white/[0.05] bg-[#0B0C10] flex items-center justify-between select-none">
    <!-- Левая часть: кнопка мобильного меню + имя пользователя -->
    <div class="flex items-center gap-2 sm:gap-3 text-sm min-w-0">
      <button
        @click="$emit('toggle-menu')"
        class="md:hidden p-2 rounded-xl bg-surface border border-surface-border text-text-secondary hover:text-white transition cursor-pointer shrink-0"
        title="Открыть меню"
      >
        <Menu class="w-5 h-5" />
      </button>

      <div class="flex items-center gap-2 min-w-0">
        <span class="font-bold text-white tracking-wide truncate max-w-[110px] sm:max-w-[200px]">@{{ displayUsername }}</span>
        <span class="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-accent-cyan font-mono shrink-0">{{ currentTenantName }}</span>
      </div>
    </div>

    <!-- Правые контролы -->
    <div class="flex items-center gap-3">
      <!-- Селектор языка (RU / EN / ZH / TG) -->
      <LanguageSwitcher />

      <!-- Профиль текущего сотрудника -->
      <div class="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
          {{ (store.currentUser?.name || store.currentUser?.email || 'A').charAt(0).toUpperCase() }}
        </div>
        <div class="hidden lg:block text-left">
          <div class="text-xs font-bold text-white leading-tight">
            {{ store.currentUser?.name || store.currentUser?.email || 'Пользователь' }}
          </div>
          <div class="text-[10px] text-accent-cyan font-mono leading-tight">
            {{ getRoleBadge(store.currentUser?.role) }}
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Menu } from 'lucide-vue-next';
import { useCargoStore } from '../stores/useCargoStore';
import LanguageSwitcher from './ui/LanguageSwitcher.vue';
import { useI18n } from '../locales';

const store = useCargoStore();
const route = useRoute();
const { t } = useI18n();
const slug = computed(() => (route.params.slug as string) || store.activeTenantSlug || store.tenants[0]?.slug || '');

const currentTenant = computed(() => {
  return store.tenants.find((t) => t.slug === slug.value) || store.tenant;
});
const currentTenantName = computed(() => currentTenant.value?.name || store.settings.companyName || '');

const displayUsername = computed(() => {
  if (store.currentUser?.name) {
    return store.currentUser.name;
  }
  if (store.currentUser?.email) {
    return store.currentUser.email.split('@')[0];
  }
  return currentTenant.value?.slug || '';
});

function getRoleBadge(role?: string) {
  if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') return t('nav.roleAdmin');
  if (role === 'OWNER') return t('nav.roleOwner');
  if (role === 'OPERATOR') return t('nav.rolePvz');
  if (role === 'CASHIER') return t('nav.roleCashier');
  if (role === 'SORTER' || role === 'WAREHOUSE') return t('nav.roleWms');
  return t('nav.roleOwner');
}

defineProps<{
  username?: string;
}>();

defineEmits<{
  (e: 'toggle-menu'): void;
}>();
</script>
