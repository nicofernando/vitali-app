<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
  if (!email.value || !password.value) return

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
  <div class="min-h-screen flex items-center justify-center" style="background-color: #002B5B;">
    <div class="w-full max-w-md px-6">
      <div class="flex flex-col items-center mb-10">
        <img
          src="/logo_vitalisuites_blanco.webp"
          alt="Vitali Suites"
          class="h-16 object-contain mb-4"
        />
        <p class="text-white/60 text-sm font-body">
          Plataforma Interna
        </p>
      </div>

      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <h1 class="font-heading text-2xl font-semibold text-center mb-1" style="color: #002B5B;">
          Iniciar sesión
        </h1>
        <p class="text-center text-sm text-gray-500 mb-8">
          Ingresá con tu cuenta corporativa
        </p>

        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="nombre@vitalisuites.com"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            />
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Contraseña
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            />
          </div>

          <div
            v-if="errorMessage"
            class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-2.5 px-4 rounded-full font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            style="background-color: #D4BE77; color: #002B5B;"
          >
            {{ submitting ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
