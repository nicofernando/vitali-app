<script setup lang="ts">
import {
  Building2,
  Calculator,
  Coins,
  Contact,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

interface NavItem {
  name: string
  to: string
  icon: unknown
  permission?: string
  comingSoon?: boolean
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Proyectos', to: '/projects', icon: Building2, permission: 'projects.read' },
  { name: 'Tipologías', to: '/typologies', icon: Layers, permission: 'typologies.read' },
  { name: 'Cotizador', to: '/simulator', icon: Calculator, permission: 'simulator.use' },
  { name: 'Cotizaciones', to: '/quotes', icon: FileText, permission: 'quotes.read', comingSoon: true },
  { name: 'Clientes', to: '/clients', icon: Contact, permission: 'clients.read', comingSoon: true },
  { name: 'Monedas', to: '/currencies', icon: Coins, permission: 'settings.read' },
  { name: 'Usuarios', to: '/users', icon: Users, permission: 'users.read' },
  { name: 'Configuración', to: '/settings', icon: Settings, permission: 'settings.read', comingSoon: true },
]

const visibleItems = computed(() =>
  navItems.filter(item =>
    !item.permission || permissionsStore.can(item.permission),
  ),
)

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

const logoutOpen = ref(false)

async function handleLogout() {
  await authStore.logout()
  permissionsStore.reset()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside class="flex flex-col h-full w-64 shrink-0 bg-sidebar">
    <div class="flex items-center justify-center h-16 px-6 border-b border-white/10">
      <img
        src="/logo_vitalisuites_blanco.webp"
        alt="Vitali Suites"
        class="h-8 object-contain"
      >
    </div>

    <nav class="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto">
      <template v-for="item in visibleItems" :key="item.name">
        <!-- Item con ruta real -->
        <RouterLink
          v-if="!item.comingSoon"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="isActive(item.to)
            ? 'bg-white/15 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          {{ item.name }}
        </RouterLink>

        <!-- Item próximamente (sin ruta) -->
        <span
          v-else
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed text-white/70"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          {{ item.name }}
          <span class="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-white/10 text-white/60 rounded px-1.5 py-0.5">
            Próximamente
          </span>
        </span>
      </template>
    </nav>

    <div class="border-t border-white/10 px-3 py-4">
      <div class="px-3 py-2 mb-1">
        <p class="text-xs text-white/40 truncate">
          {{ authStore.user?.email }}
        </p>
      </div>

      <AlertDialog v-model:open="logoutOpen">
        <AlertDialogTrigger as-child>
          <button
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut class="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrás sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará tu sesión actual. Cualquier trabajo no guardado se perderá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction @click="handleLogout">
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </aside>
</template>
