<script setup lang="ts">
import type { Project, Tower } from '@/types'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import TowerForm from '@/components/projects/TowerForm.vue'
import UnitForm from '@/components/projects/UnitForm.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProjectsStore } from '@/stores/projects'
import { useTowersStore } from '@/stores/towers'
import { useUnitsStore } from '@/stores/units'

interface PendingDelete { message: string, onConfirm: () => Promise<void> }
const pendingDelete = ref<PendingDelete | null>(null)

const projectsStore = useProjectsStore()
const towersStore = useTowersStore()
const unitsStore = useUnitsStore()

const { projects, loading: projectsLoading } = storeToRefs(projectsStore)
const { towers, loading: towersLoading } = storeToRefs(towersStore)
const { units, loading: unitsLoading } = storeToRefs(unitsStore)

const selectedProject = ref<Project | null>(null)
const selectedTower = ref<Tower | null>(null)

const showProjectForm = ref(false)
const editingProject = ref<Project | null>(null)

const showTowerForm = ref(false)
const editingTower = ref<Tower | null>(null)

const showUnitForm = ref(false)

onMounted(() => projectsStore.fetchAll())

function selectProject(project: Project) {
  selectedProject.value = project
  selectedTower.value = null
  unitsStore.units = []
  towersStore.fetchByProject(project.id)
}

function selectTower(tower: Tower) {
  selectedTower.value = tower
  unitsStore.fetchByTower(tower.id)
}

function openNewProject() {
  editingProject.value = null
  showProjectForm.value = true
}

function openEditProject(project: Project) {
  editingProject.value = project
  showProjectForm.value = true
}

function openNewTower() {
  editingTower.value = null
  showTowerForm.value = true
}

function openEditTower(tower: Tower) {
  editingTower.value = tower
  showTowerForm.value = true
}

function deleteProject(project: Project) {
  pendingDelete.value = {
    message: `¿Eliminar "${project.name}"? Se eliminarán todas sus torres y departamentos.`,
    onConfirm: async () => {
      await projectsStore.remove(project.id)
      if (selectedProject.value?.id === project.id) {
        selectedProject.value = null
        selectedTower.value = null
      }
    },
  }
}

function deleteTower(tower: Tower) {
  pendingDelete.value = {
    message: `¿Eliminar torre "${tower.name}"?`,
    onConfirm: async () => {
      await towersStore.remove(tower.id)
      if (selectedTower.value?.id === tower.id) {
        selectedTower.value = null
        unitsStore.units = []
      }
    },
  }
}

function deleteUnit(unitId: string) {
  pendingDelete.value = {
    message: '¿Eliminar este departamento?',
    onConfirm: () => unitsStore.remove(unitId),
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">
          Proyectos
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Gestión de proyectos inmobiliarios
        </p>
      </div>
      <Button @click="openNewProject">
        + Nuevo proyecto
      </Button>
    </div>

    <!-- Tabla de proyectos -->
    <div class="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Tasa anual</TableHead>
            <TableHead>Créditos</TableHead>
            <TableHead class="text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="projectsLoading">
            <TableRow v-for="i in 3" :key="i">
              <TableCell colspan="6">
                <Skeleton class="h-4 w-full" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="projects.length === 0">
            <TableRow>
              <TableCell colspan="6" class="text-center text-muted-foreground py-8">
                Sin proyectos. Creá el primero.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow
              v-for="project in projects"
              :key="project.id"
              :class="selectedProject?.id === project.id ? 'bg-accent/40 border-l-2 border-l-primary' : 'hover:bg-muted/40'"
              class="cursor-pointer transition-colors"
              @click="selectProject(project)"
            >
              <TableCell class="font-medium">
                <span class="flex items-center gap-2">
                  <span
                    v-if="selectedProject?.id === project.id"
                    class="w-1.5 h-1.5 rounded-full bg-primary inline-block"
                  />
                  {{ project.name }}
                </span>
              </TableCell>
              <TableCell>{{ project.location ?? '—' }}</TableCell>
              <TableCell>{{ project.currency?.code ?? '—' }}</TableCell>
              <TableCell>{{ (project.annual_interest_rate * 100).toFixed(2) }}%</TableCell>
              <TableCell>
                <div class="flex gap-1">
                  <Badge v-if="project.french_credit_enabled" variant="secondary" class="text-xs">
                    Francés
                  </Badge>
                  <Badge v-if="project.smart_credit_enabled" variant="secondary" class="text-xs">
                    Inteligente
                  </Badge>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2" @click.stop>
                  <Button size="sm" variant="outline" @click="openEditProject(project)">
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" @click="deleteProject(project)">
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Hint cuando no hay proyecto seleccionado -->
    <p v-if="projects.length > 0 && !selectedProject" class="text-sm text-muted-foreground text-center py-2">
      ↑ Hacé click en un proyecto para ver sus torres y departamentos
    </p>

    <!-- Torres (visible solo si hay proyecto seleccionado) -->
    <template v-if="selectedProject">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-heading font-semibold">
            Torres — {{ selectedProject.name }}
          </h2>
          <Button size="sm" @click="openNewTower">
            + Nueva torre
          </Button>
        </div>

        <div class="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Plazo máx.</TableHead>
                <TableHead>PIE mín.</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="towersLoading">
                <TableRow v-for="i in 2" :key="i">
                  <TableCell colspan="5">
                    <Skeleton class="h-4 w-full" />
                  </TableCell>
                </TableRow>
              </template>
              <template v-else-if="towers.length === 0">
                <TableRow>
                  <TableCell colspan="5" class="text-center text-muted-foreground py-6">
                    Sin torres. Agregá la primera.
                  </TableCell>
                </TableRow>
              </template>
              <template v-else>
                <TableRow
                  v-for="tower in towers"
                  :key="tower.id"
                  :class="selectedTower?.id === tower.id ? 'bg-accent/40 border-l-2 border-l-primary' : 'hover:bg-muted/40'"
                  class="cursor-pointer transition-colors"
                  @click="selectTower(tower)"
                >
                  <TableCell class="font-medium">
                    <span class="flex items-center gap-2">
                      <span
                        v-if="selectedTower?.id === tower.id"
                        class="w-1.5 h-1.5 rounded-full bg-primary inline-block"
                      />
                      {{ tower.name }}
                    </span>
                  </TableCell>
                  <TableCell>{{ tower.delivery_date ?? '—' }}</TableCell>
                  <TableCell>{{ tower.max_financing_years }} años</TableCell>
                  <TableCell>{{ tower.min_pie_percentage }}%</TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2" @click.stop>
                      <Button size="sm" variant="outline" @click="openEditTower(tower)">
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" @click="deleteTower(tower)">
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
      </div>
    </template>

    <!-- Hint cuando no hay torre seleccionada -->
    <p v-if="selectedProject && towers.length > 0 && !selectedTower" class="text-sm text-muted-foreground text-center py-2">
      ↑ Hacé click en una torre para ver sus departamentos
    </p>

    <!-- Departamentos (visible solo si hay torre seleccionada) -->
    <template v-if="selectedTower">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-heading font-semibold">
            Departamentos — {{ selectedTower.name }}
          </h2>
          <Button size="sm" @click="showUnitForm = true">
            + Nuevo depto
          </Button>
        </div>

        <div class="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Tipología</TableHead>
                <TableHead>M²</TableHead>
                <TableHead>Precio lista</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="unitsLoading">
                <TableRow v-for="i in 3" :key="i">
                  <TableCell colspan="6">
                    <Skeleton class="h-4 w-full" />
                  </TableCell>
                </TableRow>
              </template>
              <template v-else-if="units.length === 0">
                <TableRow>
                  <TableCell colspan="6" class="text-center text-muted-foreground py-6">
                    Sin departamentos. Agregá el primero.
                  </TableCell>
                </TableRow>
              </template>
              <template v-else>
                <TableRow v-for="unit in units" :key="unit.id">
                  <TableCell class="font-medium">
                    {{ unit.unit_number }}
                  </TableCell>
                  <TableCell>{{ unit.floor ?? '—' }}</TableCell>
                  <TableCell>{{ unit.typology?.name ?? '—' }}</TableCell>
                  <TableCell>{{ unit.typology?.surface_m2 ?? '—' }} m²</TableCell>
                  <TableCell>{{ unit.list_price.toLocaleString('es-CL') }}</TableCell>
                  <TableCell class="text-right">
                    <Button size="sm" variant="destructive" @click="deleteUnit(unit.id)">
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
      </div>
    </template>

    <!-- Formularios en Sheet -->
    <ProjectForm
      v-model:open="showProjectForm"
      :project="editingProject"
    />

    <TowerForm
      v-if="selectedProject"
      v-model:open="showTowerForm"
      :tower="editingTower"
      :project-id="selectedProject.id"
    />

    <UnitForm
      v-if="selectedTower && selectedProject"
      v-model:open="showUnitForm"
      :tower-id="selectedTower.id"
      :project-id="selectedProject.id"
    />

    <!-- Confirmación de eliminación -->
    <AlertDialog :open="!!pendingDelete" @update:open="(v) => { if (!v) pendingDelete = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>{{ pendingDelete?.message }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDelete = null">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="pendingDelete?.onConfirm(); pendingDelete = null"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
