<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div class="p-8">
    <h1 class="font-heading text-2xl font-semibold mb-2" style="color: #002B5B;">
      Dashboard
    </h1>
    <p class="text-gray-500 text-sm">
      Bienvenido, {{ authStore.user?.email }}
    </p>
  </div>
</template>
