<script setup lang="ts">
import {
  ArrowLeft,
  Building2,
  Calculator,
  ChevronRight,
  Coins,
  Contact,
  Files,
  FileText,
  History,
  Layers,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
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
      { name: 'Monedas', to: '/currencies', icon: Coins, permission: 'settings.read' },
      { name: 'Documentos', to: '/documents', icon: Files, permission: 'settings.read' },
    ],
  },
  {
    key: 'access',
    label: 'Acceso',
    icon: Users,
    permission: 'users.read',
    items: [
      { name: 'Usuarios', to: '/users', icon: Users, permission: 'users.read' },
      { name: 'Roles', to: '/roles', icon: ShieldCheck, permission: 'roles.read' },
      { name: 'Auditoría', to: '/audit', icon: History, permission: 'audit.read' },
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
          <div class="mt-auto pt-4 space-y-0.5">
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
                 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          @click="exitModule"
        >
          <ArrowLeft class="w-3.5 h-3.5 shrink-0" />
          Volver
        </button>

        <!-- Label de sección del módulo -->
        <p class="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40 select-none">
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
      </nav>
    </Transition>

    <!-- Footer: nombre + email + logout -->
    <div class="border-t border-white/10 px-3 py-4 shrink-0">
      <div class="px-3 py-2 mb-1">
        <p v-if="authStore.profile?.full_name" class="text-xs font-medium text-white/70 truncate">
          {{ authStore.profile.full_name }}
        </p>
        <p class="text-xs text-white/40 truncate">
          {{ authStore.user?.email }}
        </p>
      </div>

      <button
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Cerrar sesión"
        @click="handleLogout"
      >
        <LogOut class="w-4 h-4 shrink-0" />
        Cerrar sesión
      </button>
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
