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
