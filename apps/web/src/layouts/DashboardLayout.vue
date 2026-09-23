<template>
  <div class="min-h-screen bg-[#0B0C10] flex flex-col md:flex-row text-white selection:bg-accent-blue selection:text-white max-w-full overflow-x-hidden">
    <!-- Десктопный сайдбар -->
    <Sidebar class="hidden md:flex shrink-0" />

    <!-- Мобильный выезжающий drawer сайдбара с плавной анимацией выезда и затемнения -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity ease-out duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMobileMenuOpen"
          class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden flex"
          @click="isMobileMenuOpen = false"
        >
          <Transition
            appear
            enter-active-class="transition ease-out duration-300 transform"
            enter-from-class="-translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition ease-in duration-200 transform"
            leave-from-class="translate-x-0"
            leave-to-class="-translate-x-full"
          >
            <div
              v-if="isMobileMenuOpen"
              @click.stop
              class="w-72 max-w-[85vw] h-full bg-[#0B0C10] border-r border-white/[0.08] p-4 flex flex-col justify-between overflow-y-auto shadow-2xl"
            >
              <!-- Шапка мобильного сайдбара с кнопкой закрытия -->
              <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3 shrink-0">
                <Logo />
                <button
                  @click="isMobileMenuOpen = false"
                  class="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-text-tertiary hover:text-white transition cursor-pointer"
                  title="Закрыть меню"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Сайдбар в мобильном режиме -->
              <div class="flex-1 overflow-y-auto">
                <Sidebar :mobile="true" @navigate="isMobileMenuOpen = false" />
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Основная рабочая область -->
    <div class="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
      <!-- Хедер -->
      <Header @toggle-menu="isMobileMenuOpen = !isMobileMenuOpen" />

      <!-- Контент страниц -->
      <main class="flex-1 px-3 py-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8 min-w-0 overflow-x-hidden">
        <router-view />
      </main>

      <!-- Мобильный нижний бар навигации (Bottom Bar) с быстрыми действиями -->
      <nav class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0C10]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 sm:px-4 flex items-center justify-around z-40 select-none">
        <router-link
          :to="route.path.startsWith('/admin') ? '/admin' : `/o/${slug}/dashboard`"
          class="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition"
          :class="route.path.includes('dashboard') || route.path === '/admin' ? 'text-accent-cyan font-bold' : 'text-text-secondary hover:text-white'"
        >
          <LayoutDashboard class="w-5 h-5" />
          <span class="text-[10px]">{{ t('nav.dashboard') }}</span>
        </router-link>

        <router-link
          :to="`/o/${slug}/packages`"
          class="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition"
          :class="route.path.includes('packages') ? 'text-accent-cyan font-bold' : 'text-text-secondary hover:text-white'"
        >
          <Package class="w-5 h-5" />
          <span class="text-[10px]">{{ t('nav.packages') }}</span>
        </router-link>

        <!-- Центральная кнопка WMS Приемка -->
        <router-link
          :to="`/o/${slug}/wms`"
          class="flex flex-col items-center -mt-6 group"
        >
          <div class="w-12 h-12 rounded-2xl bg-accent-blue shadow-glow-blue flex items-center justify-center text-white group-active:scale-95 transition border border-accent-cyan/40">
            <ScanBarcode class="w-6 h-6" />
          </div>
          <span class="text-[10px] font-bold mt-1 text-accent-cyan">{{ t('nav.warehouseShort') }}</span>
        </router-link>

        <router-link
          :to="`/o/${slug}/trips`"
          class="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition"
          :class="route.path.includes('trips') ? 'text-accent-cyan font-bold' : 'text-text-secondary hover:text-white'"
        >
          <Truck class="w-5 h-5" />
          <span class="text-[10px]">{{ t('nav.trips') }}</span>
        </router-link>

        <button
          type="button"
          @click="isMobileMenuOpen = true"
          class="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-text-secondary hover:text-white transition cursor-pointer"
        >
          <Menu class="w-5 h-5" />
          <span class="text-[10px]">{{ t('nav.menu') }}</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import Header from '../components/Header.vue';
import Logo from '../components/Logo.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';
import { LayoutDashboard, ScanBarcode, Package, Truck, Menu, X } from 'lucide-vue-next';

const route = useRoute();
const store = useCargoStore();
const { t } = useI18n();
const slug = computed(() => (route.params.slug as string) || store.activeTenantSlug || store.tenants[0]?.slug || '');
const isMobileMenuOpen = ref(false);

watch(
  () => route.params.slug,
  (newSlug) => {
    if (newSlug && typeof newSlug === 'string') {
      store.setTenantSlug(newSlug);
    }
  },
  { immediate: true }
);

// Автоматически закрывать мобильное меню при любой смене страницы
watch(
  () => route.fullPath,
  () => {
    isMobileMenuOpen.value = false;
  }
);
</script>
