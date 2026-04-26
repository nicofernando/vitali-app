import type { AuditLogEntry } from '@/types'

// ─── Lookup types ─────────────────────────────────────────────────────────────

export interface AuditLookups {
  rolesById: Map<string, string>
  permissionsById: Map<string, { module: string, action: string }>
  usersById: Map<string, string>
}

export const EMPTY_LOOKUPS: AuditLookups = {
  rolesById: new Map(),
  permissionsById: new Map(),
  usersById: new Map(),
}

// ─── Detail output types ──────────────────────────────────────────────────────

export interface AuditFieldChange {
  field: string
  before: unknown
  after: unknown
}

export interface AuditFieldSnapshot {
  field: string
  value: unknown
}

export interface AuditRelationalSummary {
  kind: string
  name: string
  id: string | null
  tag?: string | null
}

export type AuditDetail
  = | { mode: 'diff', changes: AuditFieldChange[] }
    | { mode: 'snapshot', variant: 'create' | 'delete', fields: AuditFieldSnapshot[] }
    | { mode: 'relational', summary: AuditRelationalSummary }
    | { mode: 'raw' }

// Campos a excluir en snapshots — son metadatos de fila, no datos de negocio
const SNAPSHOT_EXCLUDE = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'deleted_at',
])

// ─── Helpers internos de resolución ──────────────────────────────────────────

function shortId(id: string | null | undefined): string {
  if (!id)
    return '—'
  return id.slice(0, 8)
}

function resolveRoleName(payload: AuditLogEntry['payload'], lookups: AuditLookups): string {
  const name = payload.role_name
  if (typeof name === 'string' && name)
    return name
  const roleId = typeof payload.role_id === 'string' ? payload.role_id : undefined
  return lookups.rolesById.get(roleId ?? '') ?? shortId(roleId)
}

function resolvePermissionLabel(payload: AuditLogEntry['payload'], lookups: AuditLookups): string {
  const mod = typeof payload.module === 'string' ? payload.module : undefined
  const act = typeof payload.permission_action === 'string' ? payload.permission_action : undefined
  if (mod && act)
    return `${mod}.${act}`
  const permId = typeof payload.permission_id === 'string' ? payload.permission_id : undefined
  const live = lookups.permissionsById.get(permId ?? '')
  if (live)
    return `${live.module}.${live.action}`
  return shortId(permId)
}

function resolveUserName(payload: AuditLogEntry['payload'], lookups: AuditLookups): string {
  const name = payload.user_name
  if (typeof name === 'string' && name)
    return name
  const userId = typeof payload.user_id === 'string' ? payload.user_id : undefined
  return lookups.usersById.get(userId ?? '') ?? shortId(userId)
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Creó',
  update: 'Modificó',
  delete: 'Eliminó',
  role_assigned: 'Asignó rol',
  role_removed: 'Removió rol',
  permission_added: 'Agregó permiso',
  permission_removed: 'Removió permiso',
  assignment_added: 'Asignó cliente',
  assignment_removed: 'Removió asignación',
}

const ENTITY_LABELS: Record<string, string> = {
  clients: 'Cliente',
  quotes: 'Cotización',
  users: 'Usuario',
  user_profiles: 'Perfil',
  roles: 'Rol',
  projects: 'Proyecto',
  towers: 'Torre',
  typologies: 'Tipología',
  units: 'Unidad',
  currencies: 'Moneda',
  document_templates: 'Plantilla',
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType
}

interface AuditPayload {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  changed_fields?: string[]
}

function formatValue(val: unknown): string {
  if (val === null)
    return 'null'
  if (val === undefined)
    return 'undefined'
  if (typeof val === 'string')
    return `'${val}'`
  return String(val)
}

export function formatChangedFields(payload: AuditPayload): string[] {
  const { before, after, changed_fields } = payload
  if (!changed_fields || changed_fields.length === 0)
    return []

  return changed_fields.map((field) => {
    const prev = before?.[field]
    const next = after?.[field]
    return `${field}: ${formatValue(prev)} → ${formatValue(next)}`
  })
}

// ─── formatPayloadSummary ─────────────────────────────────────────────────────
// Genera una línea de resumen legible para mostrar en listas del audit log.
// Acepta lookups opcionales para resolver nombres cuando el trigger no los persistió.

export function formatPayloadSummary(
  entry: Pick<AuditLogEntry, 'action' | 'payload'>,
  lookups: AuditLookups = EMPTY_LOOKUPS,
): string {
  const { action, payload } = entry

  switch (action) {
    case 'create':
      return 'Nuevo registro'
    case 'delete':
      return 'Registro eliminado'
    case 'update': {
      const fields = (payload.changed_fields ?? []) as string[]
      if (fields.length === 0)
        return 'Sin cambios registrados'
      if (fields.length <= 3)
        return fields.join(', ')
      return `${fields.slice(0, 3).join(', ')} y ${fields.length - 3} más`
    }
    case 'role_assigned':
      return `Asignó rol: ${resolveRoleName(payload, lookups)}`
    case 'role_removed':
      return `Removió rol: ${resolveRoleName(payload, lookups)}`
    case 'permission_added':
      return `Agregó permiso: ${resolvePermissionLabel(payload, lookups)}`
    case 'permission_removed':
      return `Removió permiso: ${resolvePermissionLabel(payload, lookups)}`
    case 'assignment_added': {
      const userName = resolveUserName(payload, lookups)
      const assignType = payload.assignment_type as string | undefined
      return assignType ? `Asignó cliente: ${userName} (${assignType})` : `Asignó cliente: ${userName}`
    }
    case 'assignment_removed': {
      const userName = resolveUserName(payload, lookups)
      const assignType = payload.assignment_type as string | undefined
      return assignType ? `Removió asignación: ${userName} (${assignType})` : `Removió asignación: ${userName}`
    }
    default:
      return actionLabel(action)
  }
}

// Acciones relacionales — agrupadas para validación y uso externo
export const RELATIONAL_ACTIONS = new Set([
  'role_assigned',
  'role_removed',
  'permission_added',
  'permission_removed',
  'assignment_added',
  'assignment_removed',
])

// ─── formatPayloadDetail ──────────────────────────────────────────────────────
// Genera una estructura de detalle tipada para el panel de detalle del audit log.
// Separa en modos: diff (update), snapshot (create/delete), relational, raw.

export function formatPayloadDetail(
  entry: Pick<AuditLogEntry, 'action' | 'payload'>,
  lookups: AuditLookups = EMPTY_LOOKUPS,
): AuditDetail {
  const { action, payload } = entry

  if (action === 'update') {
    const fields = (payload.changed_fields ?? []) as string[]
    return {
      mode: 'diff',
      changes: fields.map(f => ({
        field: f,
        before: payload.before?.[f],
        after: payload.after?.[f],
      })),
    }
  }

  if (action === 'create') {
    const source = (payload.after ?? {}) as Record<string, unknown>
    return {
      mode: 'snapshot',
      variant: 'create',
      fields: Object.entries(source)
        .filter(([k]) => !SNAPSHOT_EXCLUDE.has(k))
        .map(([field, value]) => ({ field, value })),
    }
  }

  if (action === 'delete') {
    const source = (payload.before ?? {}) as Record<string, unknown>
    return {
      mode: 'snapshot',
      variant: 'delete',
      fields: Object.entries(source)
        .filter(([k]) => !SNAPSHOT_EXCLUDE.has(k))
        .map(([field, value]) => ({ field, value })),
    }
  }

  if (action === 'role_assigned' || action === 'role_removed') {
    return {
      mode: 'relational',
      summary: {
        kind: 'Rol',
        name: resolveRoleName(payload, lookups),
        id: (payload.role_id as string | undefined) ?? null,
      },
    }
  }

  if (action === 'permission_added' || action === 'permission_removed') {
    return {
      mode: 'relational',
      summary: {
        kind: 'Permiso',
        name: resolvePermissionLabel(payload, lookups),
        id: (payload.permission_id as string | undefined) ?? null,
      },
    }
  }

  if (action === 'assignment_added' || action === 'assignment_removed') {
    const rawType = payload.assignment_type as string | undefined
    return {
      mode: 'relational',
      summary: {
        kind: 'Usuario',
        name: resolveUserName(payload, lookups),
        id: (payload.user_id as string | undefined) ?? null,
        tag: rawType ?? null,
      },
    }
  }

  return { mode: 'raw' }
}
