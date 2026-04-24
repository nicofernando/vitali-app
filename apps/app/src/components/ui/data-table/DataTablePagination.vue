<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = withDefaults(defineProps<{
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  pageSizeOptions?: number[]
}>(), {
  pageSizeOptions: () => [10, 25, 50, 100],
})

const emit = defineEmits<{
  'update:currentPage': [value: number]
  'update:pageSize': [value: number]
}>()

const pageRangeLabel = computed(() => {
  if (props.totalItems === 0)
    return '0 items'
  const start = (props.currentPage - 1) * props.pageSize + 1
  const end = Math.min(props.currentPage * props.pageSize, props.totalItems)
  return `${start}–${end} de ${props.totalItems}`
})
</script>

<template>
  <div class="flex items-center justify-between flex-wrap gap-4 mt-4">
    <div class="flex items-center gap-4">
      <p class="text-sm text-muted-foreground">
        {{ pageRangeLabel }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">Filas por página:</span>
        <Select
          :model-value="String(pageSize)"
          @update:model-value="(v) => emit('update:pageSize', Number(v))"
        >
          <SelectTrigger class="h-8 w-[70px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="size in pageSizeOptions"
              :key="size"
              :value="String(size)"
            >
              {{ size }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage === 1"
        @click="emit('update:currentPage', currentPage - 1)"
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <span class="text-sm px-2 tabular-nums">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage === totalPages"
        @click="emit('update:currentPage', currentPage + 1)"
      >
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
