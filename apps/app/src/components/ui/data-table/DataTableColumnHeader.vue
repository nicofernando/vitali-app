<script setup lang="ts">
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-vue-next'

const props = defineProps<{
  sortKey: string
  currentSortKey: string | null
  currentSortOrder: 'asc' | 'desc'
  label?: string
  align?: 'left' | 'center' | 'right'
}>()

const emit = defineEmits<{
  sort: [key: string]
}>()

function toggleSort() {
  emit('sort', props.sortKey)
}
</script>

<template>
  <button
    class="flex items-center gap-1.5 hover:text-primary transition-colors select-none w-full"
    :class="[
      currentSortKey === sortKey ? 'text-primary' : '',
      align === 'center' ? 'justify-center mx-auto' : align === 'right' ? 'justify-end ml-auto' : 'justify-start',
    ]"
    @click="toggleSort"
  >
    <slot>{{ label }}</slot>
    <ChevronUp v-if="currentSortKey === sortKey && currentSortOrder === 'asc'" class="h-3.5 w-3.5 shrink-0" />
    <ChevronDown v-else-if="currentSortKey === sortKey && currentSortOrder === 'desc'" class="h-3.5 w-3.5 shrink-0" />
    <ChevronsUpDown v-else class="h-3.5 w-3.5 shrink-0" />
  </button>
</template>
