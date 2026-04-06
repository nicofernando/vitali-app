<script setup lang="ts">
import { onMounted } from 'vue'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.initialize()
})
</script>

<template>
  <RouterView />
  <Toaster />
</template>
