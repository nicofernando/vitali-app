<script setup lang="ts">
import { LogOut, ShieldOff } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

async function logout() {
  await authStore.logout()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#002B5B]">
    <div class="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center space-y-6">
      <div class="flex justify-center">
        <div class="bg-red-100 rounded-full p-4">
          <ShieldOff class="h-10 w-10 text-red-500" />
        </div>
      </div>
      <div class="space-y-2">
        <h1 class="text-xl font-bold text-gray-900">
          Sin rol asignado
        </h1>
        <p class="text-gray-500 text-sm">
          Tu cuenta no tiene un rol asignado. Contactá al administrador para obtener acceso al sistema.
        </p>
      </div>
      <Button variant="outline" class="w-full" @click="logout">
        <LogOut class="h-4 w-4 mr-2" />
        Cerrar sesión
      </Button>
    </div>
  </div>
</template>
