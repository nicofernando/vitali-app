<script setup lang="ts">
import { Building2, Contact, FileText, Layers, LayoutList, TowerControl } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'

const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

const displayName = computed(() => {
  const meta = authStore.user?.user_metadata
  return (meta?.full_name as string | undefined) || (meta?.name as string | undefined) || authStore.user?.email
})

interface Stats {
  projects: number | null
  towers: number | null
  units: number | null
  typologies: number | null
  clients: number | null
  quotes: number | null
}

const stats = ref<Stats>({
  projects: null,
  towers: null,
  units: null,
  typologies: null,
  clients: null,
  quotes: null,
})
const loadingStats = ref(true)

interface StatCard {
  key: keyof Stats
  label: string
  icon: unknown
  permission: string
}

const statCards: StatCard[] = [
  { key: 'projects', label: 'Proyectos', icon: Building2, permission: 'projects.read' },
  { key: 'towers', label: 'Torres', icon: TowerControl, permission: 'projects.read' },
  { key: 'units', label: 'Departamentos', icon: LayoutList, permission: 'units.read' },
  { key: 'typologies', label: 'Tipologías', icon: Layers, permission: 'typologies.read' },
  { key: 'clients', label: 'Clientes', icon: Contact, permission: 'clients.read' },
  { key: 'quotes', label: 'Cotizaciones', icon: FileText, permission: 'quotes.read' },
]

const visibleCards = computed(() =>
  statCards.filter(c => permissionsStore.can(c.permission)),
)

onMounted(async () => {
  loadingStats.value = true
  try {
    const [p, t, u, ty, c, q] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('towers').select('*', { count: 'exact', head: true }),
      supabase.from('units').select('*', { count: 'exact', head: true }),
      supabase.from('typologies').select('*', { count: 'exact', head: true }),
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('quotes').select('*', { count: 'exact', head: true }),
    ])
    stats.value = {
      projects: p.count,
      towers: t.count,
      units: u.count,
      typologies: ty.count,
      clients: c.count,
      quotes: q.count,
    }
  }
  finally {
    loadingStats.value = false
  }
})
</script>

<template>
  <div class="p-4 md:p-8 max-w-5xl mx-auto">
    <h1 class="font-heading text-2xl font-semibold mb-1 text-sidebar">
      Dashboard
    </h1>
    <p class="text-gray-500 text-sm mb-8">
      Bienvenido, {{ displayName }}
    </p>

    <div
      v-if="visibleCards.length"
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4"
    >
      <Card
        v-for="card in visibleCards"
        :key="card.key"
        class="overflow-hidden"
      >
        <CardContent class="pt-6 pb-5">
          <div class="flex items-start gap-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
              <component :is="card.icon" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm text-muted-foreground leading-none mb-1">
                {{ card.label }}
              </p>
              <Skeleton v-if="loadingStats" class="h-8 w-16 mt-1" />
              <p v-else class="text-3xl font-bold font-heading leading-none">
                {{ stats[card.key] ?? '—' }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <p v-else class="text-sm text-muted-foreground">
      No tenés módulos disponibles aún. Contactá a un administrador.
    </p>
  </div>
</template>
