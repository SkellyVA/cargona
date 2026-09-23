<template>
  <aside
    class="flex flex-col justify-start select-none"
    :class="mobile ? 'w-full' : 'w-64 min-h-screen bg-[#0B0C10] p-4 border-r border-white/[0.05] shrink-0'"
  >
    <div class="space-y-4">
      <!-- Логотип в сайдбаре (только для десктопа) -->
      <div v-if="!mobile" class="px-2 pt-1 pb-1">
        <Logo />
      </div>

      <!-- Категория 1: Основное -->
      <div class="bg-surface border border-surface-border rounded-2xl p-2 space-y-0.5 shadow-card">
        <router-link
          v-if="store.hasPermission('dashboard')"
          :to="`/o/${slug}/dashboard`"
          @click="emit('navigate')"
          class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
          :class="isActive('dashboard') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
        >
          <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('dashboard') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
            <LayoutDashboard class="w-4 h-4" />
          </div>
          <span>{{ t('nav.dashboard') }}</span>
        </router-link>

        <router-link
          v-if="store.hasPermission('packages')"
          :to="`/o/${slug}/packages`"
          @click="emit('navigate')"
          class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
          :class="isActive('packages') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
        >
          <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('packages') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
            <Package class="w-4 h-4" />
          </div>
          <span>{{ t('nav.packages') }}</span>
        </router-link>

        <router-link
          v-if="store.hasPermission('wms')"
          :to="`/o/${slug}/wms`"
          @click="emit('navigate')"
          class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
          :class="isActive('wms') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
        >
          <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('wms') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
            <Warehouse class="w-4 h-4" />
          </div>
          <span>{{ t('nav.wms') }}</span>
        </router-link>

        <router-link
          v-if="store.hasPermission('pvz')"
          :to="`/o/${slug}/pvz`"
          @click="emit('navigate')"
          class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
          :class="isActive('pvz') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
        >
          <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('pvz') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
            <QrCode class="w-4 h-4" />
          </div>
          <span>{{ t('nav.pvz') }}</span>
        </router-link>
      </div>

      <!-- Категория 2: Бизнес -->
      <div v-if="store.hasPermission('branches') || store.hasPermission('trips') || store.hasPermission('customers') || store.hasPermission('finance') || store.hasPermission('audit')">
        <div class="text-[11px] font-semibold text-text-tertiary tracking-wider px-3 mb-1.5 uppercase">Бизнес</div>
        <div class="bg-surface border border-surface-border rounded-2xl p-2 space-y-0.5 shadow-card">
          <router-link
            v-if="store.hasPermission('branches')"
            :to="`/o/${slug}/branches`"
            @click="emit('navigate')"
            class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
            :class="isActive('branches') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('branches') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
              <MapPin class="w-4 h-4" />
            </div>
            <span>{{ t('nav.branches') }}</span>
          </router-link>

          <router-link
            v-if="store.hasPermission('trips')"
            :to="`/o/${slug}/trips`"
            @click="emit('navigate')"
            class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
            :class="isActive('trips') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('trips') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
              <Truck class="w-4 h-4" />
            </div>
            <span>{{ t('nav.trips') }}</span>
          </router-link>

          <router-link
            v-if="store.hasPermission('customers')"
            :to="`/o/${slug}/customers`"
            @click="emit('navigate')"
            class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
            :class="isActive('customers') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('customers') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
              <Users class="w-4 h-4" />
            </div>
            <span>{{ t('nav.customers') }}</span>
          </router-link>

          <router-link
            v-if="store.hasPermission('finance')"
            :to="`/o/${slug}/finance`"
            @click="emit('navigate')"
            class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
            :class="isActive('finance') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('finance') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
              <Wallet class="w-4 h-4" />
            </div>
            <span>{{ t('nav.finance') }}</span>
          </router-link>

          <router-link
            v-if="store.hasPermission('audit')"
            :to="`/o/${slug}/audit`"
            @click="emit('navigate')"
            class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
            :class="isActive('audit') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('audit') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
              <ScrollText class="w-4 h-4" />
            </div>
            <span>{{ t('nav.audit') }}</span>
          </router-link>

          <router-link
            :to="`/o/${slug}/app`"
            target="_blank"
            @click="emit('navigate')"
            class="flex items-center justify-between px-3 py-2 rounded-xl font-medium transition text-sm text-text-secondary hover:text-white hover:bg-white/[0.03]"
          >
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-text-secondary">
                <Smartphone class="w-4 h-4" />
              </div>
              <span>{{ t('nav.miniapp') }}</span>
            </div>
            <ExternalLink class="w-3.5 h-3.5 text-text-tertiary" />
          </router-link>
        </div>
      </div>

      <!-- Категория 3: Система -->
      <div v-if="store.hasPermission('settings') || isSuperAdmin">
        <div class="text-[11px] font-semibold text-text-tertiary tracking-wider px-3 mb-1.5 uppercase">Система</div>
        <div class="bg-surface border border-surface-border rounded-2xl p-2 space-y-0.5 shadow-card">
          <router-link
            v-if="store.hasPermission('settings')"
            :to="`/o/${slug}/settings`"
            @click="emit('navigate')"
            class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
            :class="isActive('settings') ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="isActive('settings') ? 'bg-accent-blue/20 text-accent-cyan' : 'text-text-secondary'">
              <SlidersHorizontal class="w-4 h-4" />
            </div>
            <span>{{ t('nav.settings') }}</span>
          </router-link>

          <!-- ПАНЕЛЬ CARGONA OS: ДОСТУПНА ИСКЛЮЧИТЕЛЬНО ДЛЯ СУПЕР-АДМИНИСТРАТОРА ПЛАТФОРМЫ -->
          <router-link
            v-if="isSuperAdmin"
            to="/admin"
            @click="emit('navigate')"
            class="flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition text-sm"
            :class="route.path === '/admin' ? 'bg-white/[0.07] text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="route.path === '/admin' ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-secondary'">
              <Server class="w-4 h-4" />
            </div>
            <span>{{ t('nav.admin') }}</span>
          </router-link>
        </div>
      </div>

      <!-- Блок выхода: сразу под категорией Система -->
      <div class="pt-2">
        <button
          @click="handleLogout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-accent-coral transition font-semibold text-xs sm:text-sm cursor-pointer"
        >
          <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-accent-coral">
            <LogOut class="w-4 h-4" />
          </div>
          <span>{{ t('nav.logout') }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Logo from './Logo.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  QrCode,
  MapPin,
  Truck,
  Users,
  Wallet,
  ScrollText,
  Smartphone,
  Server,
  SlidersHorizontal,
  LogOut,
  ExternalLink,
} from 'lucide-vue-next';

const props = defineProps<{
  tenantSlug?: string;
  mobile?: boolean;
}>();

const emit = defineEmits<{
  (e: 'navigate'): void;
}>();

const route = useRoute();
const router = useRouter();
const store = useCargoStore();
const { t } = useI18n();
const slug = computed(() => props.tenantSlug || (route.params.slug as string) || store.activeTenantSlug || store.tenants[0]?.slug || '');
const isSuperAdmin = computed(() => store.currentUser?.role === 'SUPER_ADMIN' || store.currentUser?.role === 'SUPERADMIN');

function isActive(viewName: string) {
  return route.path.includes(viewName);
}

function handleLogout() {
  store.logout();
  router.push('/login');
  emit('navigate');
}
</script>
