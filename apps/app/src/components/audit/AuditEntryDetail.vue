<script setup lang="ts">
import type { AuditLookups } from '@/lib/audit-format'
import type { AuditLogEntry } from '@/types'
import { computed, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EMPTY_LOOKUPS, formatPayloadDetail } from '@/lib/audit-format'

const props = defineProps<{
  entry: AuditLogEntry
  lookups?: AuditLookups
}>()

const effectiveLookups = computed(() => props.lookups ?? EMPTY_LOOKUPS)
const detail = computed(() => formatPayloadDetail(props.entry, effectiveLookups.value))
const showRaw = ref(false)

function formatValue(v: unknown): string {
  if (v === null || v === undefined)
    return '—'
  if (typeof v === 'string')
    return v
  return JSON.stringify(v)
}
</script>

<template>
  <div class="space-y-3 p-3">
    <!-- Header con entity_id -->
    <div class="flex items-center justify-between gap-2">
      <span class="font-mono text-xs text-muted-foreground">
        ID: {{ entry.entity_id }}
      </span>
      <button
        type="button"
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="showRaw = !showRaw"
      >
        {{ showRaw ? 'Ocultar JSON' : 'Ver JSON' }}
      </button>
    </div>

    <!-- DIFF: update -->
    <template v-if="detail.mode === 'diff'">
      <p class="text-xs font-semibold text-[#002B5B]">
        Campos modificados
      </p>
      <Table v-if="detail.changes.length > 0">
        <TableHeader>
          <TableRow>
            <TableHead class="text-xs">
              Campo
            </TableHead>
            <TableHead class="text-xs">
              Antes
            </TableHead>
            <TableHead class="text-xs">
              Después
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="c in detail.changes" :key="c.field">
            <TableCell class="font-mono text-xs py-1.5">
              {{ c.field }}
            </TableCell>
            <TableCell class="font-mono text-xs py-1.5 text-red-700/80 break-all">
              {{ formatValue(c.before) }}
            </TableCell>
            <TableCell class="font-mono text-xs py-1.5 text-green-700/80 break-all">
              {{ formatValue(c.after) }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p v-else class="text-xs text-muted-foreground">
        Sin campos registrados.
      </p>
    </template>

    <!-- SNAPSHOT: create / delete -->
    <template v-else-if="detail.mode === 'snapshot'">
      <p class="text-xs font-semibold text-[#002B5B]">
        {{ detail.variant === 'create' ? 'Datos del registro creado' : 'Datos del registro eliminado' }}
      </p>
      <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
        <template v-for="f in detail.fields" :key="f.field">
          <dt class="font-mono text-muted-foreground">
            {{ f.field }}
          </dt>
          <dd class="font-mono break-all">
            {{ formatValue(f.value) }}
          </dd>
        </template>
      </dl>
    </template>

    <!-- RELATIONAL: role / permission / assignment -->
    <template v-else-if="detail.mode === 'relational'">
      <div class="rounded-md border border-[#002B5B]/20 bg-[#002B5B]/5 px-3 py-2">
        <p class="text-xs uppercase tracking-wide text-[#002B5B]/60">
          {{ detail.summary.kind }}
        </p>
        <div class="mt-1 flex items-center gap-2 flex-wrap">
          <span class="text-sm font-semibold text-[#002B5B]">{{ detail.summary.name }}</span>
          <Badge v-if="detail.summary.tag" variant="outline" class="text-xs">
            {{ detail.summary.tag }}
          </Badge>
        </div>
        <p v-if="detail.summary.id" class="mt-1 font-mono text-[10px] text-muted-foreground">
          {{ detail.summary.id }}
        </p>
      </div>
    </template>

    <!-- RAW: fallback -->
    <template v-else>
      <pre class="text-xs overflow-auto max-h-40 bg-muted rounded p-2 font-mono">{{ JSON.stringify(entry.payload, null, 2) }}</pre>
    </template>

    <!-- JSON inspector opcional -->
    <pre
      v-if="showRaw"
      class="text-xs overflow-auto max-h-40 bg-muted rounded p-2 font-mono"
    >{{ JSON.stringify(entry.payload, null, 2) }}</pre>
  </div>
</template>
