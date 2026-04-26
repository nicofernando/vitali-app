<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import PermissionRefreshBanner from '@/components/users/PermissionRefreshBanner.vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import AppSidebar from './AppSidebar.vue'

const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const sidebarOpen = ref(false)

onMounted(async () => {
  if (authStore.user && !permissionsStore.loaded) {
    await permissionsStore.load(authStore.user.id)
  }
})
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <PermissionRefreshBanner />
    <!-- Overlay mobile -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-20 bg-black/50 md:hidden"
      @click="sidebarOpen = false"
    />

    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <!-- Top bar solo mobile -->
      <header class="flex items-center h-14 px-4 bg-[#002B5B] shrink-0 md:hidden">
        <button
          class="text-white/80 hover:text-white transition-colors p-1 -ml-1"
          aria-label="Abrir menú"
          @click="sidebarOpen = true"
        >
          <Menu class="w-5 h-5" />
        </button>
        <img
          src="/logo_vitalisuites_blanco.webp"
          alt="Vitali Suites"
          class="h-6 object-contain mx-auto"
        >
        <div class="w-7" />
      </header>

      <main class="flex-1 overflow-y-auto bg-gray-50">
        <RouterView />
      </main>
    </div>
  </div>
</template>
