<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { usePermissionsStore } from '@/stores/permissions'

const permissionsStore = usePermissionsStore()
const { permissionsChanged } = storeToRefs(permissionsStore)

function reload() {
  window.location.reload()
}
</script>

<template>
  <Transition name="banner">
    <div
      v-if="permissionsChanged"
      class="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-lg"
    >
      <div class="flex items-center gap-2">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span class="text-sm font-medium">
          Tu rol cambió. Recargá la página para ver los cambios.
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" variant="outline" class="text-amber-900 border-amber-200 hover:bg-amber-100" @click="reload">
          Recargar
        </Button>
        <button class="text-white/80 hover:text-white text-lg leading-none" @click="permissionsStore.dismissChange">
          ×
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.banner-enter-active,
.banner-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
