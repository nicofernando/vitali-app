<script setup lang="ts">
import type { AuditLookups } from '@/lib/audit-format'
import type { AuditLogEntry } from '@/types'
import { onMounted, ref, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { actionLabel, EMPTY_LOOKUPS, formatPayloadSummary } from '@/lib/audit-format'
import { useAuditStore } from '@/stores/audit'

const props = defineProps<{
  entityType: string
  entityId: string
  lookups?: AuditLookups
}>()

const auditStore = useAuditStore()
const entries = ref<AuditLogEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  role_assigned: 'bg-purple-100 text-purple-700',
  role_removed: 'bg-orange-100 text-orange-700',
  assignment_added: 'bg-indigo-100 text-indigo-700',
  assignment_removed: 'bg-pink-100 text-pink-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

onMounted(async () => {
  loading.value = true
  try {
    entries.value = await auditStore.fetchByEntity(props.entityType, props.entityId)
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar historial'
  }
  finally {
    loading.value = false
  }
})

watch(
  [() => props.entityType, () => props.entityId],
  async ([newType, newId]) => {
    loading.value = true
    error.value = null
    try {
      entries.value = await auditStore.fetchByEntity(newType, newId)
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Error al cargar historial'
    }
    finally {
      loading.value = false
    }
  },
)
</script>

<template>
  <div class="space-y-4">
    <p v-if="error" class="text-xs text-destructive">
      {{ error }}
    </p>
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="flex gap-3">
        <Skeleton class="h-8 w-8 rounded-full shrink-0" />
        <div class="space-y-1 flex-1">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-3 w-48" />
        </div>
      </div>
    </template>
    <template v-else>
      <div v-if="entries.length === 0" class="text-sm text-muted-foreground text-center py-4">
        Sin historial de cambios
      </div>
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="flex gap-3"
      >
        <div class="flex flex-col items-center">
          <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {{ (entry.actor_name ?? entry.actor_id ?? 'S').charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 w-px bg-border mt-1" />
        </div>
        <div class="pb-4 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <Badge class="text-xs" :class="[ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-700']" variant="outline">
              {{ actionLabel(entry.action) }}
            </Badge>
            <span class="text-xs text-muted-foreground">{{ formatDate(entry.created_at) }}</span>
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ entry.actor_name ?? entry.actor_id?.slice(0, 8) ?? 'Sistema' }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ formatPayloadSummary(entry, props.lookups ?? EMPTY_LOOKUPS) }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
