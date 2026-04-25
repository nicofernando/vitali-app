<script setup lang="ts">
import {
  ArrowLeft,
  Building2,
  Calculator,
  ChevronRight,
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
import { computed, ref, watch } from 'vue'
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

interface SidebarModule {
  key: string
  label: string
  icon: unknown
  permission?: string
  items: NavItem[]
}

// ─── Datos de navegación ────────────────────────────────────────────

const mainItems: NavItem[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Cotizador', to: '/simulator', icon: Calculator, permission: 'simulator.use' },
  { name: 'Stock', to: '/stock', icon: LayoutList, permission: 'units.read' },
  { name: 'Cotizaciones', to: '/quotes', icon: FileText, permission: 'quotes.read' },
  { name: 'Clientes', to: '/clients', icon: Contact, permission: 'clients.read' },
]

// Para agregar un módulo nuevo (ej: RRHH), solo agregar un objeto acá.
const modules: SidebarModule[] = [
  {
    key: 'config',
    label: 'Configuración',
    icon: Settings,
    permission: 'settings.read',
    items: [
      { name: 'Proyectos', to: '/projects', icon: Building2, permission: 'projects.read' },
      { name: 'Tipologías', to: '/typologies', icon: Layers, permission: 'typologies.read' },
      { name: 'Usuarios', to: '/users', icon: Users, permission: 'users.read' },
      { name: 'Monedas', to: '/currencies', icon: Coins, permission: 'settings.read' },
      { name: 'Configuración', to: '/settings', icon: Settings, permission: 'settings.read' },
    ],
  },
]

// ─── Estado ─────────────────────────────────────────────────────────

const sidebarMode = ref<string>('main')

// Auto-sincronizar el modo con la ruta activa.
// Si el usuario navega a /projects directamente (URL, back button, etc.),
// el sidebar se posiciona en el modo correcto sin intervención manual.
watch(
  () => route.path,
  (path) => {
    for (const mod of modules) {
      if (mod.items.some(item => path === item.to || path.startsWith(`${item.to}/`))) {
        sidebarMode.value = mod.key
        return
      }
    }
    sidebarMode.value = 'main'
  },
  { immediate: true },
)

// ─── Computed ────────────────────────────────────────────────────────

const visibleMain = computed(() =>
  mainItems.filter(item => !item.permission || permissionsStore.can(item.permission)),
)

const visibleModules = computed(() =>
  modules.filter(mod => !mod.permission || permissionsStore.can(mod.permission)),
)

const activeModule = computed(() =>
  sidebarMode.value !== 'main'
    ? (modules.find(m => m.key === sidebarMode.value) ?? null)
    : null,
)

const visibleModuleItems = computed(() => {
  if (!activeModule.value)
    return []
  return activeModule.value.items.filter(
    item => !item.permission || permissionsStore.can(item.permission),
  )
})

// ─── Helpers ─────────────────────────────────────────────────────────

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}

function isModuleActive(mod: SidebarModule): boolean {
  return mod.items.some(item => route.path === item.to || route.path.startsWith(`${item.to}/`))
}

function enterModule(key: string): void {
  sidebarMode.value = key
}

function exitModule(): void {
  sidebarMode.value = 'main'
}

function handleNavClick(): void {
  emit('close')
}

// ─── Logout ──────────────────────────────────────────────────────────

const logoutOpen = ref(false)

async function handleLogout(): Promise<void> {
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
    <!-- Logo -->
    <div class="flex items-center justify-center h-16 px-6 border-b border-white/10 shrink-0">
      <img
        src="/logo_vitalisuites_blanco.webp"
        alt="Vitali Suites"
        class="h-8 object-contain"
      >
    </div>

    <!-- Transición suave entre modos -->
    <Transition name="sidebar-fade" mode="out-in">
      <!-- ── MODO PRINCIPAL ── -->
      <nav
        v-if="sidebarMode === 'main'"
        key="main"
        class="flex-1 py-6 px-3 overflow-y-auto flex flex-col"
      >
        <!-- Ítems operacionales -->
        <div class="flex-1 space-y-0.5">
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

        <!-- Entradas a módulos (al fondo) -->
        <template v-if="visibleModules.length > 0">
          <div class="my-4 border-t border-white/10" />
          <div class="space-y-0.5">
            <button
              v-for="mod in visibleModules"
              :key="mod.key"
              class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="isModuleActive(mod)
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'"
              @click="enterModule(mod.key)"
            >
              <component :is="mod.icon" class="w-4 h-4 shrink-0" />
              {{ mod.label }}
              <ChevronRight class="w-3.5 h-3.5 ml-auto opacity-40" />
            </button>
          </div>
        </template>
      </nav>

      <!-- ── MODO MÓDULO ── -->
      <nav
        v-else
        key="module"
        class="flex-1 py-4 px-3 overflow-y-auto flex flex-col"
      >
        <!-- Volver -->
        <button
          class="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium
                 text-white/45 hover:text-white/75 hover:bg-white/5 transition-colors mb-3"
          @click="exitModule"
        >
          <ArrowLeft class="w-4 h-4 shrink-0" />
          Inicio
        </button>

        <!-- Label del módulo -->
        <div class="border-t border-white/10 pt-4">
          <p class="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
            {{ activeModule?.label }}
          </p>

          <!-- Ítems del módulo -->
          <div class="space-y-0.5">
            <template v-for="item in visibleModuleItems" :key="item.name">
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
        </div>
      </nav>
    </Transition>

    <!-- Footer: email + logout -->
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

<style scoped>
.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: opacity 0.12s ease;
}
.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
}
</style>
