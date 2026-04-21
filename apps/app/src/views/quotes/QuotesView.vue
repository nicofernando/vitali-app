<script setup lang="ts">
import type { QuoteSummary } from '@/types'
import { storeToRefs } from 'pinia'
import { onMounted, shallowRef } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

onMounted(() => quotesStore.fetchAll())

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
  catch {
    toast.error('Error al generar el PDF')
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
    <div>
      <h1 class="text-2xl font-heading font-bold text-foreground">
        Cotizaciones
      </h1>
      <p class="text-sm text-muted-foreground mt-1">
        Historial de cotizaciones emitidas
      </p>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
    </div>

    <Table v-else>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Proyecto / Depto</TableHead>
          <TableHead>Crédito</TableHead>
          <TableHead>Precio lista</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="quotes.length === 0">
          <TableCell colspan="7" class="text-center text-muted-foreground py-8">
            No hay cotizaciones registradas
          </TableCell>
        </TableRow>
        <TableRow v-for="quote in quotes" :key="quote.id">
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
</template>
