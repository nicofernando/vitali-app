<script setup lang="ts">
import type { QuoteSummary } from '@/types'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DataTableColumnHeader from '@/components/ui/data-table/DataTableColumnHeader.vue'
import DataTablePagination from '@/components/ui/data-table/DataTablePagination.vue'
import { Input } from '@/components/ui/input'
import LoadingOverlay from '@/components/ui/loading-overlay/LoadingOverlay.vue'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuotesStore } from '@/stores/quotes'

const quotesStore = useQuotesStore()
const { quotes, loading } = storeToRefs(quotesStore)

const generatingPdf = shallowRef<Set<string>>(new Set())

// --- Pagination, Filtering & Sorting logic ---
type SortKey = 'client' | 'project' | 'credit_type' | 'list_price' | 'date' | 'status'
const searchQuery = ref('')
const sortKey = ref<SortKey>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const itemsPerPage = ref(10)

onMounted(() => quotesStore.fetchAll())

const filteredQuotes = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query)
    return quotes.value

  return quotes.value.filter((q) => {
    return (q.client_name ?? '').toLowerCase().includes(query)
      || (q.client_rut ?? '').toLowerCase().includes(query)
      || (q.project_name ?? '').toLowerCase().includes(query)
      || (q.tower_name ?? '').toLowerCase().includes(query)
  })
})

const sortedQuotes = computed(() => {
  return [...filteredQuotes.value].sort((a, b) => {
    let valA: string | number
    let valB: string | number

    switch (sortKey.value) {
      case 'client':
        valA = a.client_name || ''
        valB = b.client_name || ''
        break
      case 'project':
        valA = a.project_name || ''
        valB = b.project_name || ''
        break
      case 'list_price':
        valA = a.list_price || 0
        valB = b.list_price || 0
        break
      case 'date':
        valA = new Date(a.created_at).getTime()
        valB = new Date(b.created_at).getTime()
        break
      case 'status':
        valA = statusLabel(a.status)
        valB = statusLabel(b.status)
        break
      case 'credit_type':
        valA = a.credit_type || ''
        valB = b.credit_type || ''
        break
      default:
        valA = new Date(a.created_at).getTime()
        valB = new Date(b.created_at).getTime()
        break
    }

    if (valA < valB)
      return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB)
      return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const paginatedQuotes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return sortedQuotes.value.slice(start, start + itemsPerPage.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedQuotes.value.length / itemsPerPage.value)))

watch([searchQuery, sortKey, sortOrder], () => {
  currentPage.value = 1
})

function toggleSort(key: string) {
  const k = key as SortKey
  if (sortKey.value === k) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = k
    sortOrder.value = 'asc'
  }
}

function formatCurrency(amount: number | null, symbol = '$') {
  if (amount === null)
    return '—'
  return `${symbol} ${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function creditTypeLabel(type: string) {
  if (type === 'french')
    return 'Francés'
  if (type === 'smart')
    return 'Inteligente'
  return 'Ambos'
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'sent')
    return 'default'
  if (status === 'expired')
    return 'destructive'
  return 'secondary'
}

function statusLabel(status: string) {
  if (status === 'sent')
    return 'Enviada'
  if (status === 'expired')
    return 'Vencida'
  return 'Borrador'
}

async function handleDownload(quote: QuoteSummary) {
  if (generatingPdf.value.has(quote.id))
    return
  generatingPdf.value = new Set([...generatingPdf.value, quote.id])
  try {
    const result = await quotesStore.generatePdf(quote.id)
    window.open(result.url, '_blank')
  }
  catch (err) {
    if (err instanceof Error) {
      console.error('[QuotesView] generatePdf error:', err.message, err.stack)
      toast.error(`Error al generar el PDF: ${err.message}`)
    }
    else {
      console.error('[QuotesView] generatePdf error:', err)
      toast.error('Error al generar el PDF')
    }
  }
  finally {
    const next = new Set(generatingPdf.value)
    next.delete(quote.id)
    generatingPdf.value = next
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Cotizaciones
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Historial de cotizaciones emitidas
        </p>
      </div>
      <div class="w-full sm:w-80">
        <Input v-model="searchQuery" placeholder="Buscar cliente, RUT o proyecto..." class="w-full" />
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow class="bg-muted/60 hover:bg-muted/60 border-b-2">
              <TableHead class="font-semibold text-foreground">
                <DataTableColumnHeader sort-key="client" :current-sort-key="sortKey" :current-sort-order="sortOrder" label="Cliente" @sort="toggleSort" />
              </TableHead>
              <TableHead class="font-semibold text-foreground">
                <DataTableColumnHeader sort-key="project" :current-sort-key="sortKey" :current-sort-order="sortOrder" label="Proyecto / Depto" @sort="toggleSort" />
              </TableHead>
              <TableHead class="font-semibold text-foreground">
                <DataTableColumnHeader sort-key="credit_type" :current-sort-key="sortKey" :current-sort-order="sortOrder" label="Crédito" @sort="toggleSort" />
              </TableHead>
              <TableHead class="font-semibold text-foreground">
                <DataTableColumnHeader sort-key="list_price" :current-sort-key="sortKey" :current-sort-order="sortOrder" label="Precio lista" @sort="toggleSort" />
              </TableHead>
              <TableHead class="font-semibold text-foreground">
                <DataTableColumnHeader sort-key="date" :current-sort-key="sortKey" :current-sort-order="sortOrder" label="Fecha" @sort="toggleSort" />
              </TableHead>
              <TableHead class="font-semibold text-foreground">
                <DataTableColumnHeader sort-key="status" :current-sort-key="sortKey" :current-sort-order="sortOrder" label="Estado" @sort="toggleSort" />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="paginatedQuotes.length === 0">
              <TableCell colspan="7" class="text-center text-muted-foreground py-8">
                {{ searchQuery ? 'Sin resultados para esa búsqueda' : 'Aún no hay cotizaciones registradas' }}
              </TableCell>
            </TableRow>
            <TableRow v-for="quote in paginatedQuotes" :key="quote.id">
              <TableCell>
                <p class="font-medium">
                  {{ quote.client_name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ quote.client_rut ?? '—' }}
                </p>
              </TableCell>
              <TableCell>
                <p class="font-medium">
                  {{ quote.project_name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ quote.tower_name }} · Dpto {{ quote.unit_number }}{{ quote.floor ? ` (Piso ${quote.floor})` : '' }}
                </p>
              </TableCell>
              <TableCell>
                {{ creditTypeLabel(quote.credit_type) }}
              </TableCell>
              <TableCell>
                {{ formatCurrency(quote.list_price, quote.currency_symbol) }}
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">
                {{ formatDate(quote.created_at) }}
              </TableCell>
              <TableCell>
                <Badge :variant="statusVariant(quote.status)">
                  {{ statusLabel(quote.status) }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="generatingPdf.has(quote.id)"
                  @click="handleDownload(quote)"
                >
                  {{ generatingPdf.has(quote.id) ? 'Generando...' : quote.pdf_path ? 'Descargar PDF' : 'Generar PDF' }}
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination Controls -->
      <DataTablePagination
        v-model:current-page="currentPage"
        v-model:page-size="itemsPerPage"
        :total-items="sortedQuotes.length"
        :total-pages="totalPages"
        :page-size-options="[10, 25, 50, 100]"
      />
    </div>

    <LoadingOverlay :show="generatingPdf.size > 0" message="Generando PDF de cotización..." />
  </div>
</template>
