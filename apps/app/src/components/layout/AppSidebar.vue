<script setup lang="ts">
import {
  Building2,
  Calculator,
  Coins,
  Contact,
  FileText,
  Layers,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Settings,
  Users,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
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
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

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

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Cotizador', to: '/simulator', icon: Calculator, permission: 'simulator.use' },
  { name: 'Stock', to: '/stock', icon: LayoutList, permission: 'units.read' },
  { name: 'Cotizaciones', to: '/quotes', icon: FileText, permission: 'quotes.read' },
  { name: 'Clientes', to: '/clients', icon: Contact, permission: 'clients.read' },
]

const adminNavItems: NavItem[] = [
  { name: 'Proyectos', to: '/projects', icon: Building2, permission: 'projects.read' },
  { name: 'Tipologías', to: '/typologies', icon: Layers, permission: 'typologies.read' },
  { name: 'Usuarios', to: '/users', icon: Users, permission: 'users.read' },
  { name: 'Monedas', to: '/currencies', icon: Coins, permission: 'settings.read' },
  { name: 'Configuración', to: '/settings', icon: Settings, permission: 'settings.read' },
]

const visibleMain = computed(() =>
  mainNavItems.filter(item => !item.permission || permissionsStore.can(item.permission)),
)

const visibleAdmin = computed(() =>
  adminNavItems.filter(item => !item.permission || permissionsStore.can(item.permission)),
)

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}

function handleNavClick() {
  emit('close')
}

const logoutOpen = ref(false)

async function handleLogout() {
  await authStore.logout()
  permissionsStore.reset()
  emit('close')
  router.push({ name: 'login' })
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-sidebar
           transition-transform duration-300 ease-in-out
           md:relative md:translate-x-0 md:z-auto"
    :class="props.open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex items-center justify-center h-16 px-6 border-b border-white/10 shrink-0">
      <img
        src="/logo_vitalisuites_blanco.webp"
        alt="Vitali Suites"
        class="h-8 object-contain"
      >
    </div>

    <nav class="flex-1 py-6 px-3 overflow-y-auto">
      <div class="space-y-0.5">
        <template v-for="item in visibleMain" :key="item.name">
          <RouterLink
            v-if="!item.comingSoon"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.to)
              ? 'bg-white/15 text-white'
              : 'text-white/70 hover:bg-white/10 hover:text-white'"
            @click="handleNavClick"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            {{ item.name }}
          </RouterLink>
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
      </div>

      <template v-if="visibleAdmin.length > 0">
        <div class="my-4 border-t border-white/10" />
        <p class="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/35">
          Administración
        </p>
        <div class="space-y-0.5">
          <template v-for="item in visibleAdmin" :key="item.name">
            <RouterLink
              v-if="!item.comingSoon"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="isActive(item.to)
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'"
              @click="handleNavClick"
            >
              <component :is="item.icon" class="w-4 h-4 shrink-0" />
              {{ item.name }}
            </RouterLink>
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
        </div>
      </template>
    </nav>

    <div class="border-t border-white/10 px-3 py-4 shrink-0">
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
