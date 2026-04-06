<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import {
  LayoutDashboard,
  Building2,
  Calculator,
  FileText,
  Users,
  Settings,
  LogOut,
} from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

interface NavItem {
  name: string
  to: string
  icon: unknown
  permission?: string
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Proyectos', to: '/projects', icon: Building2, permission: 'projects.read' },
  { name: 'Cotizador', to: '/simulator', icon: Calculator, permission: 'simulator.use' },
  { name: 'Cotizaciones', to: '/quotes', icon: FileText, permission: 'quotes.read' },
  { name: 'Clientes', to: '/clients', icon: Users, permission: 'clients.read' },
  { name: 'Usuarios', to: '/users', icon: Users, permission: 'users.read' },
  { name: 'Configuración', to: '/settings', icon: Settings, permission: 'settings.read' },
]

const visibleItems = computed(() =>
  navItems.filter(item =>
    !item.permission || permissionsStore.can(item.permission),
  ),
)

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

async function handleLogout() {
  await authStore.logout()
  permissionsStore.reset()
}
</script>

<template>
  <aside class="flex flex-col h-full w-64 shrink-0" style="background-color: #002B5B;">
    <div class="flex items-center justify-center h-16 px-6 border-b border-white/10">
      <img
        src="/logo_vitalisuites_blanco.webp"
        alt="Vitali Suites"
        class="h-8 object-contain"
      />
    </div>

    <nav class="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto">
      <RouterLink
        v-for="item in visibleItems"
        :key="item.name"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="isActive(item.to)
          ? 'bg-white/15 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'"
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0" />
        {{ item.name }}
      </RouterLink>
    </nav>

    <div class="border-t border-white/10 px-3 py-4">
      <div class="px-3 py-2 mb-1">
        <p class="text-xs text-white/40 truncate">{{ authStore.user?.email }}</p>
      </div>
      <button
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        @click="handleLogout"
      >
        <LogOut class="w-4 h-4 shrink-0" />
        Cerrar sesión
      </button>
    </div>
  </aside>
</template>
