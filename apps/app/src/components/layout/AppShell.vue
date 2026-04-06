<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import AppSidebar from './AppSidebar.vue'

const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

onMounted(async () => {
  // Al montar el shell (siempre que el usuario esté autenticado),
  // cargamos los permisos si todavía no están en memoria.
  // Esto cubre el caso de F5/recarga donde Pinia se reinicia.
  if (authStore.user && !permissionsStore.loaded) {
    await permissionsStore.load(authStore.user.id)
  }
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      <RouterView />
    </main>
  </div>
</template>
