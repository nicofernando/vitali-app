<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

defineProps<{
  show: boolean
  message?: string
}>()
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
  >
    <Loader2 class="h-10 w-10 animate-spin text-primary" />
    <p v-if="message" class="mt-4 text-lg font-medium text-foreground">
      {{ message }}
    </p>
  </div>
</template>
