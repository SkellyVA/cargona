import { createRouter, createWebHistory } from 'vue-router';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import DashboardView from '../views/DashboardView.vue';
import PackagesView from '../views/PackagesView.vue';
import BranchesView from '../views/BranchesView.vue';
import WmsView from '../views/WmsView.vue';
import TripsView from '../views/TripsView.vue';
import CustomersView from '../views/CustomersView.vue';
import FinanceView from '../views/FinanceView.vue';
import AuditView from '../views/AuditView.vue';
import SettingsView from '../views/SettingsView.vue';
import AdminView from '../views/AdminView.vue';
import TelegramMiniAppView from '../views/TelegramMiniAppView.vue';
import LoginView from '../views/LoginView.vue';

function getStoredUser(): any {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cargona_auth_user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: LoginView,
    },
    {
      path: '/',
      redirect: () => {
        const user = getStoredUser();
        if (!user || !user.email) return '/login';
        if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') return '/admin';
        if (user.organizationSlug) return `/o/${user.organizationSlug}/dashboard`;
        const savedSlug = typeof window !== 'undefined' ? localStorage.getItem('cargona_active_tenant_slug') : null;
        if (savedSlug) return `/o/${savedSlug}/dashboard`;
        return '/login';
      },
    },
    // Панель управления Cargona для владельца платформы
    {
      path: '/admin',
      component: DashboardLayout,
      children: [
        {
          path: '',
          name: 'SuperAdmin',
          component: AdminView,
        },
      ],
    },
    // Пространство карго-компании: cargona.***/o/:slug
    {
      path: '/o/:slug',
      component: DashboardLayout,
      children: [
        {
          path: '',
          redirect: (to) => `/o/${to.params.slug}/dashboard`,
        },
        {
          path: 'dashboard',
          name: 'TenantDashboard',
          component: DashboardView,
        },
        {
          path: 'packages',
          name: 'TenantPackages',
          component: PackagesView,
        },
        {
          path: 'wms',
          name: 'TenantWms',
          component: WmsView,
        },
        {
          path: 'branches',
          name: 'TenantBranches',
          component: BranchesView,
        },
        {
          path: 'pvz',
          name: 'TenantPvz',
          component: WmsView,
        },
        {
          path: 'trips',
          name: 'TenantTrips',
          component: TripsView,
        },
        {
          path: 'customers',
          name: 'TenantCustomers',
          component: CustomersView,
        },
        {
          path: 'finance',
          name: 'TenantFinance',
          component: FinanceView,
        },
        {
          path: 'audit',
          name: 'TenantAudit',
          component: AuditView,
        },
        {
          path: 'settings',
          name: 'TenantSettings',
          component: SettingsView,
        },
      ],
    },
    // Клиентский Telegram Mini App (основной путь и алиасы)
    {
      path: '/o/:slug/app',
      name: 'TelegramMiniApp',
      component: TelegramMiniAppView,
    },
    {
      path: '/app/:slug',
      name: 'TelegramMiniAppSlugAlias',
      component: TelegramMiniAppView,
    },
    {
      path: '/app',
      name: 'TelegramMiniAppRootAlias',
      component: TelegramMiniAppView,
    },
  ],
});

// Навигационный guard: защита приватных маршрутов панели и супер-админа
router.beforeEach((to, from, next) => {
  // Публичные маршруты: страница входа и клиентский Telegram Mini App
  const isPublic =
    to.path === '/login' ||
    to.path.endsWith('/app') ||
    to.path.startsWith('/app') ||
    to.name === 'TelegramMiniApp' ||
    to.name === 'TelegramMiniAppSlugAlias' ||
    to.name === 'TelegramMiniAppRootAlias';

  if (isPublic) {
    return next();
  }

  const user = getStoredUser();
  const isAuthenticated = !!(user && user.email);

  // Если пользователь не залогинен — перенаправляем на /login
  if (!isAuthenticated) {
    return next('/login');
  }

  // Защита панели управления платформой /admin — доступна только SUPER_ADMIN
  if (to.path.startsWith('/admin')) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'SUPERADMIN') {
      const savedSlug = typeof window !== 'undefined' ? localStorage.getItem('cargona_active_tenant_slug') : null;
      if (savedSlug) return next(`/o/${savedSlug}/dashboard`);
      if (user.organizationSlug) return next(`/o/${user.organizationSlug}/dashboard`);
      return next('/login');
    }
  }

  next();
});

export default router;
