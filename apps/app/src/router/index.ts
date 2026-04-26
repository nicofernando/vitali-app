import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permission?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/projects/ProjectsView.vue'),
          meta: { permission: 'projects.read' },
        },
        {
          path: 'typologies',
          name: 'typologies',
          component: () => import('@/views/projects/TypologiesView.vue'),
          meta: { permission: 'typologies.read' },
        },
        {
          path: 'simulator',
          name: 'simulator',
          component: () => import('@/views/simulator/SimulatorView.vue'),
          meta: { permission: 'simulator.use' },
        },
        {
          path: 'stock',
          name: 'stock',
          component: () => import('@/views/stock/StockView.vue'),
          meta: { permission: 'units.read' },
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/views/clients/ClientsView.vue'),
          meta: { permission: 'clients.read' },
        },
        {
          path: 'quotes',
          name: 'quotes',
          component: () => import('@/views/quotes/QuotesView.vue'),
          meta: { permission: 'quotes.read' },
        },
        {
          path: 'currencies',
          name: 'currencies',
          component: () => import('@/views/currencies/CurrenciesView.vue'),
          meta: { permission: 'settings.read' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/users/UsersView.vue'),
          meta: { permission: 'users.read' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/settings/SettingsView.vue'),
          meta: { permission: 'settings.read' },
        },
        {
          path: 'documents',
          name: 'documents',
          component: () => import('@/views/documents/DocumentsView.vue'),
          meta: { permission: 'settings.read' },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/roles/RolesView.vue'),
          meta: { permission: 'roles.read' },
        },
        {
          path: 'audit',
          name: 'audit',
          component: () => import('@/views/audit/AuditView.vue'),
          meta: { permission: 'audit.read' },
        },
      ],
    },
    {
      path: '/no-role',
      name: 'no-role',
      component: () => import('@/views/auth/NoRoleView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.session) {
    const { data } = await supabase.auth.getSession()
    authStore.session = data.session
    authStore.user = data.session?.user ?? null
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (!requiresAuth && authStore.isAuthenticated && to.name === 'login') {
    return { name: 'dashboard' }
  }

  if (authStore.user && to.name !== 'no-role' && to.name !== 'login') {
    const permStore = usePermissionsStore()
    if (!permStore.loaded) {
      try {
        await permStore.load(authStore.user.id)
      }
      catch (err) {
        console.error('[router] Failed to load permissions:', err)
        return { name: 'dashboard' }
      }
    }
    if (permStore.loaded && permStore.permissions.length === 0) {
      return { name: 'no-role' }
    }
    if (to.meta.permission && !permStore.can(to.meta.permission)) {
      return { name: 'dashboard' }
    }
  }
})

export default router
