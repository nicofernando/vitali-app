<script setup lang="ts">
import type { QuoteSummary } from '@/types'
import { storeToRefs } from 'pinia'
import { onMounted, shallowRef, ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-vue-next'
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
const itemsPerPage = 10

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
        valA = a.client_name || ''; valB = b.client_name || ''; break
      case 'project':
        valA = a.project_name || ''; valB = b.project_name || ''; break
      case 'list_price':
        valA = a.list_price || 0; valB = b.list_price || 0; break
      case 'date':
        valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime(); break
      case 'status':
        valA = statusLabel(a.status); valB = statusLabel(b.status); break
      case 'credit_type':
        valA = a.credit_type || ''; valB = b.credit_type || ''; break
      default:
        valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime(); break
    }

    if (valA < valB)
      return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB)
      return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const paginatedQuotes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return sortedQuotes.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(sortedQuotes.value.length / itemsPerPage)) || 1

watch([searchQuery, sortKey, sortOrder], () => {
  currentPage.value = 1
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key)
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
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
    } else {
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
            <TableRow>
              <TableHead class="cursor-pointer select-none hover:bg-muted/50" @click="toggleSort('client')">
                <div class="flex items-center gap-1">
                  Cliente
                  <ChevronDown v-if="sortKey === 'client' && sortOrder === 'desc'" class="h-3 w-3" />
                  <ChevronUp v-else-if="sortKey === 'client' && sortOrder === 'asc'" class="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead class="cursor-pointer select-none hover:bg-muted/50" @click="toggleSort('project')">
                <div class="flex items-center gap-1">
                  Proyecto / Depto
                  <ChevronDown v-if="sortKey === 'project' && sortOrder === 'desc'" class="h-3 w-3" />
                  <ChevronUp v-else-if="sortKey === 'project' && sortOrder === 'asc'" class="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead class="cursor-pointer select-none hover:bg-muted/50" @click="toggleSort('credit_type')">
                <div class="flex items-center gap-1">
                  Crédito
                  <ChevronDown v-if="sortKey === 'credit_type' && sortOrder === 'desc'" class="h-3 w-3" />
                  <ChevronUp v-else-if="sortKey === 'credit_type' && sortOrder === 'asc'" class="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead class="cursor-pointer select-none hover:bg-muted/50" @click="toggleSort('list_price')">
                <div class="flex items-center gap-1">
                  Precio lista
                  <ChevronDown v-if="sortKey === 'list_price' && sortOrder === 'desc'" class="h-3 w-3" />
                  <ChevronUp v-else-if="sortKey === 'list_price' && sortOrder === 'asc'" class="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead class="cursor-pointer select-none hover:bg-muted/50" @click="toggleSort('date')">
                <div class="flex items-center gap-1">
                  Fecha
                  <ChevronDown v-if="sortKey === 'date' && sortOrder === 'desc'" class="h-3 w-3" />
                  <ChevronUp v-else-if="sortKey === 'date' && sortOrder === 'asc'" class="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead class="cursor-pointer select-none hover:bg-muted/50" @click="toggleSort('status')">
                <div class="flex items-center gap-1">
                  Estado
                  <ChevronDown v-if="sortKey === 'status' && sortOrder === 'desc'" class="h-3 w-3" />
                  <ChevronUp v-else-if="sortKey === 'status' && sortOrder === 'asc'" class="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="paginatedQuotes.length === 0">
              <TableCell colspan="7" class="text-center text-muted-foreground py-8">
                No hay cotizaciones para mostrar
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
      <div v-if="totalPages > 1" class="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="text-sm text-muted-foreground min-w-[5rem] text-center">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
