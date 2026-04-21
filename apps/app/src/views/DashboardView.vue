<script setup lang="ts">
import { Building2, Calculator, Coins, Users } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'

const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

interface QuickAccessCard {
  name: string
  description: string
  to: string
  icon: unknown
  permission: string
}

const allCards: QuickAccessCard[] = [
  {
    name: 'Proyectos',
    description: 'Administrá los proyectos inmobiliarios y sus parámetros.',
    to: '/projects',
    icon: Building2,
    permission: 'projects.read',
  },
  {
    name: 'Cotizador',
    description: 'Simulá cuotas y generá cotizaciones para los clientes.',
    to: '/simulator',
    icon: Calculator,
    permission: 'simulator.use',
  },
  {
    name: 'Usuarios',
    description: 'Gestioná los usuarios y sus roles de acceso.',
    to: '/users',
    icon: Users,
    permission: 'users.read',
  },
  {
    name: 'Monedas',
    description: 'Configurá las monedas disponibles para los proyectos.',
    to: '/currencies',
    icon: Coins,
    permission: 'settings.read',
  },
]

const visibleCards = computed(() =>
  allCards.filter(card => permissionsStore.can(card.permission)),
)
</script>

<template>
  <div class="p-4 md:p-8">
    <h1 class="font-heading text-2xl font-semibold mb-2 text-sidebar">
      Dashboard
    </h1>
    <p class="text-gray-500 text-sm mb-8">
      Bienvenido, {{ authStore.user?.email }}
    </p>

    <div
      v-if="visibleCards.length"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <RouterLink
        v-for="card in visibleCards"
        :key="card.name"
        :to="card.to"
        class="group block"
      >
        <Card class="h-full transition-shadow hover:shadow-md">
          <CardHeader class="pb-3">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <component :is="card.icon" class="w-5 h-5" />
              </div>
              <CardTitle class="text-base">
                {{ card.name }}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{{ card.description }}</CardDescription>
          </CardContent>
        </Card>
      </RouterLink>
    </div>

    <p v-else class="text-sm text-muted-foreground">
      No tenés módulos disponibles aún. Contactá a un administrador.
    </p>
  </div>
</template>
