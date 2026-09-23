<template>
  <div class="min-h-screen bg-[#0B0C10] text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
    <!-- Фоновое свечение (Нео-градиент) -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-accent-blue/15 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-accent-cyan/10 rounded-full blur-[140px] pointer-events-none"></div>

    <!-- Языковой переключатель в верхнем углу -->
    <div class="absolute top-5 right-5 z-20">
      <LanguageSwitcher />
    </div>

    <div class="w-full max-w-md bg-surface border border-surface-border rounded-3xl p-7 sm:p-9 shadow-card relative z-10 space-y-6">
      <!-- Логотип и заголовок -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue/30 to-accent-cyan/20 border border-accent-cyan/40 p-2 shadow-glow-blue mb-1">
          <svg class="w-full h-full text-accent-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 12v10" />
          </svg>
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">CargonaOS</h1>
        <p class="text-xs text-text-tertiary">{{ t('auth.subtitle') }}</p>
      </div>

      <!-- Сообщение об ошибке -->
      <div v-if="errorMessage" class="bg-accent-coral/10 border border-accent-coral/30 rounded-2xl p-3 text-xs text-accent-coral flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Форма входа -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">{{ t('auth.emailLabel') }}</label>
          <div class="relative">
            <Mail class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              v-model="email"
              type="email"
              required
              placeholder="user@cargo.com"
              class="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary font-mono focus:border-accent-cyan focus:outline-none transition"
            />
          </div>
        </div>

        <div>
          <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">{{ t('auth.passwordLabel') }}</label>
          <div class="relative">
            <Lock class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              v-model="password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary font-mono focus:border-accent-cyan focus:outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          class="w-full h-12 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue flex items-center justify-center gap-2 transition active:scale-[0.99] mt-2 cursor-pointer"
        >
          <LogIn class="w-4 h-4" />
          <span>{{ t('auth.loginBtn') }}</span>
        </button>
      </form>

      <div class="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary opacity-75 hover:opacity-100 transition">
        <span>Powered by</span>
        <a
          href="https://t.me/cargonaorg"
          target="_blank"
          rel="noopener noreferrer"
          class="font-bold text-white hover:text-accent-cyan hover:underline transition"
        >
          Cargona
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-vue-next';
import { useCargoStore, CurrentUser } from '../stores/useCargoStore';
import LanguageSwitcher from '../components/ui/LanguageSwitcher.vue';
import { useI18n } from '../locales';

const router = useRouter();
const store = useCargoStore();
const { t } = useI18n();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

onMounted(() => {
  store.fetchTenantsFromBackend();
});

async function handleLogin() {
  errorMessage.value = '';
  const cleanEmail = email.value.trim().toLowerCase();
  const cleanPass = password.value.trim();

  if (!cleanEmail) {
    errorMessage.value = t('auth.emailLabel');
    return;
  }
  if (!cleanPass) {
    errorMessage.value = t('auth.passwordLabel');
    return;
  }

  isLoading.value = true;

  try {
    // 1. Попытка аутентификации через API бэкенда (SuperAdmin, Tenant Owner, Staff)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.tenant) {
          store.upsertTenant(data.tenant);
        }
        if (data.user) {
          store.login(data.user);
          if (data.user.role === 'SUPERADMIN' || data.user.role === 'SUPER_ADMIN') {
            router.push('/admin');
          } else if (data.user.role === 'SORTER') {
            router.push(`/o/${data.user.organizationSlug}/wms`);
          } else if (data.user.role === 'CASHIER' || data.user.role === 'OPERATOR') {
            router.push(`/o/${data.user.organizationSlug}/pvz`);
          } else {
            router.push(`/o/${data.user.organizationSlug}/dashboard`);
          }
          isLoading.value = false;
          return;
        }
      } else if (res.status === 401 || res.status === 403 || res.status === 400) {
        const errData = (await res.json().catch(() => ({}))) as any;
        if (errData?.error) {
          errorMessage.value = errData.error;
          isLoading.value = false;
          return;
        }
      }
    } catch {
      // Backend offline fallback to local store checks
    }

    // 2. Локальная проверка Супер-Администратора (offline fallback)
    if (cleanEmail === 'admin@cargona.io') {
      if (cleanPass !== 'admin' && cleanPass !== 'admin123' && cleanPass !== 'password123') {
        errorMessage.value = t('auth.invalidCredentials');
        isLoading.value = false;
        return;
      }
      const adminUser: CurrentUser = {
        id: 'superadmin-1',
        name: 'Администратор Платформы',
        email: 'admin@cargona.io',
        role: 'SUPERADMIN',
        organizationSlug: 'cargona-platform',
        organizationName: 'CargonaOS Platform',
      };
      store.login(adminUser);
      router.push('/admin');
      isLoading.value = false;
      return;
    }

    // 3. Локальная проверка Владельцев Карго (из локального store.tenants)
    const tenant = store.tenants.find(
      (t) => t.ownerEmail?.toLowerCase().trim() === cleanEmail
    );
    if (tenant) {
      if (tenant.ownerPassword && tenant.ownerPassword.trim() !== cleanPass) {
        errorMessage.value = t('auth.invalidCredentials');
        isLoading.value = false;
        return;
      }
      if (tenant.isActive === false) {
        errorMessage.value = 'Компания деактивирована';
        isLoading.value = false;
        return;
      }
      const ownerUser: CurrentUser = {
        id: `owner-${tenant.id}`,
        name: `Владелец (${tenant.name})`,
        email: tenant.ownerEmail,
        role: 'OWNER',
        organizationSlug: tenant.slug,
        organizationName: tenant.name,
      };
      store.login(ownerUser);
      router.push(`/o/${tenant.slug}/dashboard`);
      isLoading.value = false;
      return;
    }

    // 4. Локальная проверка сотрудников (store.staff)
    const employee = store.staff.find(
      (emp) => emp.email?.toLowerCase().trim() === cleanEmail
    );
    if (employee) {
      if (employee.password && employee.password.trim() !== cleanPass) {
        errorMessage.value = t('auth.invalidCredentials');
        isLoading.value = false;
        return;
      }
      if (!employee.isActive) {
        errorMessage.value = 'Учетная запись заблокирована';
        isLoading.value = false;
        return;
      }

      const tenantSlug = employee.tenantSlug || (store.settings.codePrefix || 'cargo').toLowerCase() + '-cargo';
      const staffUser: CurrentUser = {
        id: employee.id,
        name: employee.fullName,
        email: employee.email,
        role: employee.role,
        organizationSlug: tenantSlug,
        organizationName: store.settings.companyName || 'Cargona',
      };
      store.login(staffUser);

      if (employee.role === 'SORTER') {
        router.push(`/o/${tenantSlug}/wms`);
      } else if (employee.role === 'CASHIER' || employee.role === 'OPERATOR') {
        router.push(`/o/${tenantSlug}/pvz`);
      } else {
        router.push(`/o/${tenantSlug}/dashboard`);
      }
      isLoading.value = false;
      return;
    }

    // 5. Если не найден
    errorMessage.value = t('auth.invalidCredentials');
  } finally {
    isLoading.value = false;
  }
}
</script>
