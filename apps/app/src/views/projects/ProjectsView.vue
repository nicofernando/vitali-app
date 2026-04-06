<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useTowersStore } from '@/stores/towers'
import { useUnitsStore } from '@/stores/units'
import { storeToRefs } from 'pinia'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import TowerForm from '@/components/projects/TowerForm.vue'
import UnitForm from '@/components/projects/UnitForm.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { Project, Tower } from '@/types'

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

async function deleteProject(project: Project) {
  if (!confirm(`¿Eliminar "${project.name}"? Se eliminarán todas sus torres y departamentos.`)) return
  await projectsStore.remove(project.id)
  if (selectedProject.value?.id === project.id) {
    selectedProject.value = null
    selectedTower.value = null
  }
}

async function deleteTower(tower: Tower) {
  if (!confirm(`¿Eliminar torre "${tower.name}"?`)) return
  await towersStore.remove(tower.id)
  if (selectedTower.value?.id === tower.id) {
    selectedTower.value = null
    unitsStore.units = []
  }
}

async function deleteUnit(unitId: string) {
  if (!confirm('¿Eliminar este departamento?')) return
  await unitsStore.remove(unitId)
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-heading font-bold text-foreground">Proyectos</h1>
        <p class="text-sm text-muted-foreground mt-1">Gestión de proyectos inmobiliarios</p>
      </div>
      <Button @click="openNewProject">+ Nuevo proyecto</Button>
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
            <TableHead class="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="projectsLoading">
            <TableRow v-for="i in 3" :key="i">
              <TableCell colspan="6"><Skeleton class="h-4 w-full" /></TableCell>
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
              :class="{ 'bg-accent/30': selectedProject?.id === project.id }"
              class="cursor-pointer"
              @click="selectProject(project)"
            >
              <TableCell class="font-medium">{{ project.name }}</TableCell>
              <TableCell>{{ project.location ?? '—' }}</TableCell>
              <TableCell>{{ project.currency?.code ?? '—' }}</TableCell>
              <TableCell>{{ (project.annual_interest_rate * 100).toFixed(2) }}%</TableCell>
              <TableCell>
                <div class="flex gap-1">
                  <Badge v-if="project.french_credit_enabled" variant="secondary" class="text-xs">Francés</Badge>
                  <Badge v-if="project.smart_credit_enabled" variant="secondary" class="text-xs">Inteligente</Badge>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2" @click.stop>
                  <Button size="sm" variant="outline" @click="openEditProject(project)">Editar</Button>
                  <Button size="sm" variant="destructive" @click="deleteProject(project)">Eliminar</Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Torres (visible solo si hay proyecto seleccionado) -->
    <template v-if="selectedProject">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-heading font-semibold">
            Torres — {{ selectedProject.name }}
          </h2>
          <Button size="sm" @click="openNewTower">+ Nueva torre</Button>
        </div>

        <div class="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Plazo máx.</TableHead>
                <TableHead>PIE mín.</TableHead>
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="towersLoading">
                <TableRow v-for="i in 2" :key="i">
                  <TableCell colspan="5"><Skeleton class="h-4 w-full" /></TableCell>
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
                  :class="{ 'bg-accent/30': selectedTower?.id === tower.id }"
                  class="cursor-pointer"
                  @click="selectTower(tower)"
                >
                  <TableCell class="font-medium">{{ tower.name }}</TableCell>
                  <TableCell>{{ tower.delivery_date ?? '—' }}</TableCell>
                  <TableCell>{{ tower.max_financing_years }} años</TableCell>
                  <TableCell>{{ tower.min_pie_percentage }}%</TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2" @click.stop>
                      <Button size="sm" variant="outline" @click="openEditTower(tower)">Editar</Button>
                      <Button size="sm" variant="destructive" @click="deleteTower(tower)">Eliminar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
      </div>
    </template>

    <!-- Departamentos (visible solo si hay torre seleccionada) -->
    <template v-if="selectedTower">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-heading font-semibold">
            Departamentos — {{ selectedTower.name }}
          </h2>
          <Button size="sm" @click="showUnitForm = true">+ Nuevo depto</Button>
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
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="unitsLoading">
                <TableRow v-for="i in 3" :key="i">
                  <TableCell colspan="6"><Skeleton class="h-4 w-full" /></TableCell>
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
                  <TableCell class="font-medium">{{ unit.unit_number }}</TableCell>
                  <TableCell>{{ unit.floor ?? '—' }}</TableCell>
                  <TableCell>{{ unit.typology?.name ?? '—' }}</TableCell>
                  <TableCell>{{ unit.typology?.surface_m2 ?? '—' }} m²</TableCell>
                  <TableCell>{{ unit.list_price.toLocaleString('es-CL') }}</TableCell>
                  <TableCell class="text-right">
                    <Button size="sm" variant="destructive" @click="deleteUnit(unit.id)">Eliminar</Button>
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
  </div>
</template>
