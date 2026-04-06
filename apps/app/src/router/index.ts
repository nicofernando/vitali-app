import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import { supabase } from '@/lib/supabase'

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
      ],
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

  if (to.meta.permission && authStore.user) {
    const permStore = usePermissionsStore()
    if (!permStore.loaded) {
      await permStore.load(authStore.user.id)
    }
    if (!permStore.can(to.meta.permission)) {
      return { name: 'dashboard' }
    }
  }
})

export default router
