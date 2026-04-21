<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'

const router = useRouter()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  if (!email.value || !password.value)
    return

  submitting.value = true
  errorMessage.value = ''

  try {
    await authStore.login(email.value, password.value)
    if (authStore.user) {
      await permissionsStore.load(authStore.user.id)
    }
    router.push({ name: 'dashboard' })
  }
  catch {
    errorMessage.value = 'Email o contraseña incorrectos. Verificá tus datos.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-sidebar">
    <div class="w-full max-w-md px-6">
      <div class="flex flex-col items-center mb-10">
        <img
          src="/logo_vitalisuites_blanco.webp"
          alt="Vitali Suites"
          class="h-16 object-contain mb-4"
        >
        <p class="text-white/60 text-sm font-body">
          Plataforma Interna
        </p>
      </div>

      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <h1 class="font-heading text-2xl font-semibold text-center mb-1 text-sidebar">
          Iniciar sesión
        </h1>
        <p class="text-center text-sm text-gray-500 mb-8">
          Ingresá con tu cuenta corporativa
        </p>

        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div class="space-y-1.5">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="nombre@vitalisuites.com"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="password">Contraseña</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          <div
            v-if="errorMessage"
            class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3"
          >
            {{ errorMessage }}
          </div>

          <Button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-full"
          >
            {{ submitting ? 'Ingresando...' : 'Ingresar' }}
          </Button>
        </form>
      </div>
    </div>
  </div>
</template>
