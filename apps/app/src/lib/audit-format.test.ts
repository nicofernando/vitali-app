import type { AuditLookups } from './audit-format'
import { describe, expect, it } from 'vitest'
import { actionLabel, EMPTY_LOOKUPS, entityLabel, formatChangedFields, formatPayloadDetail, formatPayloadSummary } from './audit-format'

describe('actionLabel', () => {
  it('mapea create → Creó', () => expect(actionLabel('create')).toBe('Creó'))
  it('mapea update → Modificó', () => expect(actionLabel('update')).toBe('Modificó'))
  it('mapea delete → Eliminó', () => expect(actionLabel('delete')).toBe('Eliminó'))
  it('mapea role_assigned → Asignó rol', () => expect(actionLabel('role_assigned')).toBe('Asignó rol'))
  it('mapea role_removed → Removió rol', () => expect(actionLabel('role_removed')).toBe('Removió rol'))
  it('mapea permission_added → Agregó permiso', () => expect(actionLabel('permission_added')).toBe('Agregó permiso'))
  it('mapea permission_removed → Removió permiso', () => expect(actionLabel('permission_removed')).toBe('Removió permiso'))
  it('mapea assignment_added → Asignó cliente', () => expect(actionLabel('assignment_added')).toBe('Asignó cliente'))
  it('mapea assignment_removed → Removió asignación', () => expect(actionLabel('assignment_removed')).toBe('Removió asignación'))
  it('retorna la acción sin mapear para acciones desconocidas', () => expect(actionLabel('unknown_action')).toBe('unknown_action'))
})

describe('entityLabel', () => {
  it('mapea clients → Cliente', () => expect(entityLabel('clients')).toBe('Cliente'))
  it('mapea quotes → Cotización', () => expect(entityLabel('quotes')).toBe('Cotización'))
  it('mapea users → Usuario', () => expect(entityLabel('users')).toBe('Usuario'))
  it('mapea user_profiles → Perfil', () => expect(entityLabel('user_profiles')).toBe('Perfil'))
  it('mapea roles → Rol', () => expect(entityLabel('roles')).toBe('Rol'))
  it('mapea projects → Proyecto', () => expect(entityLabel('projects')).toBe('Proyecto'))
  it('mapea towers → Torre', () => expect(entityLabel('towers')).toBe('Torre'))
  it('mapea typologies → Tipología', () => expect(entityLabel('typologies')).toBe('Tipología'))
  it('mapea units → Unidad', () => expect(entityLabel('units')).toBe('Unidad'))
  it('mapea currencies → Moneda', () => expect(entityLabel('currencies')).toBe('Moneda'))
  it('mapea document_templates → Plantilla', () => expect(entityLabel('document_templates')).toBe('Plantilla'))
  it('retorna el tipo sin mapear para entidades desconocidas', () => expect(entityLabel('unknown')).toBe('unknown'))
})

describe('formatChangedFields', () => {
  it('retorna array vacío para payload sin before/after', () => {
    expect(formatChangedFields({})).toEqual([])
  })

  it('retorna array vacío sin changed_fields', () => {
    expect(formatChangedFields({ before: {}, after: {} })).toEqual([])
  })

  it('formatea campos cambiados con flecha', () => {
    const payload = {
      before: { full_name: 'Juan', email: 'a@b.com' },
      after: { full_name: 'Juan Pérez', email: 'a@b.com' },
      changed_fields: ['full_name'],
    }
    const result = formatChangedFields(payload)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('full_name: \'Juan\' → \'Juan Pérez\'')
  })

  it('formatea múltiples campos', () => {
    const payload = {
      before: { name: 'Vendedor', description: 'desc vieja' },
      after: { name: 'Vendedor Senior', description: 'desc nueva' },
      changed_fields: ['name', 'description'],
    }
    const result = formatChangedFields(payload)
    expect(result).toHaveLength(2)
    expect(result).toContain('name: \'Vendedor\' → \'Vendedor Senior\'')
    expect(result).toContain('description: \'desc vieja\' → \'desc nueva\'')
  })

  it('maneja valores null', () => {
    const payload = {
      before: { rut: null },
      after: { rut: '12345678-9' },
      changed_fields: ['rut'],
    }
    const result = formatChangedFields(payload)
    expect(result[0]).toBe('rut: null → \'12345678-9\'')
  })

  it('maneja valores numéricos', () => {
    const payload = {
      before: { term_years: 15 },
      after: { term_years: 20 },
      changed_fields: ['term_years'],
    }
    const result = formatChangedFields(payload)
    expect(result[0]).toBe('term_years: 15 → 20')
  })

  it('ignora campos en changed_fields que no existen en before/after', () => {
    const payload = {
      before: {},
      after: {},
      changed_fields: ['nonexistent'],
    }
    const result = formatChangedFields(payload)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('nonexistent: undefined → undefined')
  })
})

describe('formatPayloadSummary', () => {
  it('create → retorna Nuevo registro', () => {
    expect(formatPayloadSummary({ action: 'create', payload: {} })).toBe('Nuevo registro')
  })

  it('delete → retorna Registro eliminado', () => {
    expect(formatPayloadSummary({ action: 'delete', payload: {} })).toBe('Registro eliminado')
  })

  it('update con changed_fields → retorna lista de campos', () => {
    expect(
      formatPayloadSummary({ action: 'update', payload: { changed_fields: ['name', 'email'] } }),
    ).toBe('name, email')
  })

  it('update con changed_fields vacío → retorna Sin cambios registrados', () => {
    expect(
      formatPayloadSummary({ action: 'update', payload: { changed_fields: [] } }),
    ).toBe('Sin cambios registrados')
  })

  it('update sin changed_fields → retorna Sin cambios registrados', () => {
    expect(
      formatPayloadSummary({ action: 'update', payload: {} }),
    ).toBe('Sin cambios registrados')
  })

  it('update con 5 changed_fields → muestra primeros 3 y conteo restante', () => {
    expect(
      formatPayloadSummary({ action: 'update', payload: { changed_fields: ['a', 'b', 'c', 'd', 'e'] } }),
    ).toBe('a, b, c y 2 más')
  })

  it('role_assigned con role_name en payload → usa el nombre del payload', () => {
    expect(
      formatPayloadSummary({ action: 'role_assigned', payload: { role_id: 'r1', role_name: 'Admin' } }),
    ).toBe('Asignó rol: Admin')
  })

  it('role_assigned sin role_name con lookup → usa lookup', () => {
    const lookups: AuditLookups = {
      ...EMPTY_LOOKUPS,
      rolesById: new Map([['r1', 'Vendedor']]),
    }
    expect(
      formatPayloadSummary({ action: 'role_assigned', payload: { role_id: 'r1' } }, lookups),
    ).toBe('Asignó rol: Vendedor')
  })

  it('role_assigned sin role_name ni lookup → usa primeros 8 chars del UUID', () => {
    expect(
      formatPayloadSummary({ action: 'role_assigned', payload: { role_id: 'abc12345-0000' } }),
    ).toBe('Asignó rol: abc12345')
  })

  it('role_removed con role_name en payload → usa el nombre del payload', () => {
    expect(
      formatPayloadSummary({ action: 'role_removed', payload: { role_id: 'r1', role_name: 'Admin' } }),
    ).toBe('Removió rol: Admin')
  })

  it('permission_added con module y permission_action en payload → muestra module.action', () => {
    expect(
      formatPayloadSummary({ action: 'permission_added', payload: { permission_id: 'p1', module: 'clients', permission_action: 'read' } }),
    ).toBe('Agregó permiso: clients.read')
  })

  it('permission_added sin module/action con lookup → usa lookup', () => {
    const lookups: AuditLookups = {
      ...EMPTY_LOOKUPS,
      permissionsById: new Map([['p1', { module: 'projects', action: 'edit' }]]),
    }
    expect(
      formatPayloadSummary({ action: 'permission_added', payload: { permission_id: 'p1' } }, lookups),
    ).toBe('Agregó permiso: projects.edit')
  })

  it('permission_removed con module y permission_action en payload → muestra module.action', () => {
    expect(
      formatPayloadSummary({ action: 'permission_removed', payload: { permission_id: 'p1', module: 'users', permission_action: 'read' } }),
    ).toBe('Removió permiso: users.read')
  })

  it('assignment_added con user_name y assignment_type en payload', () => {
    expect(
      formatPayloadSummary({ action: 'assignment_added', payload: { user_id: 'u1', user_name: 'María González', assignment_type: 'vendedor' } }),
    ).toBe('Asignó cliente: María González (vendedor)')
  })

  it('assignment_added sin user_name con lookup', () => {
    const lookups: AuditLookups = {
      ...EMPTY_LOOKUPS,
      usersById: new Map([['u1', 'Ana López']]),
    }
    expect(
      formatPayloadSummary({ action: 'assignment_added', payload: { user_id: 'u1', assignment_type: 'vendedor' } }, lookups),
    ).toBe('Asignó cliente: Ana López (vendedor)')
  })

  it('assignment_removed con user_name y assignment_type en payload', () => {
    expect(
      formatPayloadSummary({ action: 'assignment_removed', payload: { user_id: 'u1', user_name: 'Pedro', assignment_type: 'admin' } }),
    ).toBe('Removió asignación: Pedro (admin)')
  })

  it('acción desconocida → retorna la acción tal cual', () => {
    expect(
      formatPayloadSummary({ action: 'new_action' as any, payload: {} }),
    ).toBe('new_action')
  })

  it('eMPTY_LOOKUPS con role_id largo → no lanza y retorna 8 primeros chars', () => {
    expect(
      () => formatPayloadSummary({ action: 'role_assigned', payload: { role_id: 'abc12345def67890' } }, EMPTY_LOOKUPS),
    ).not.toThrow()
    expect(
      formatPayloadSummary({ action: 'role_assigned', payload: { role_id: 'abc12345def67890' } }, EMPTY_LOOKUPS),
    ).toBe('Asignó rol: abc12345')
  })
})

describe('formatPayloadDetail', () => {
  it('update con changed_fields → mode diff con changes mapeados', () => {
    const result = formatPayloadDetail({
      action: 'update',
      payload: {
        before: { name: 'old' },
        after: { name: 'new' },
        changed_fields: ['name'],
      },
    })
    expect(result).toEqual({
      mode: 'diff',
      changes: [{ field: 'name', before: 'old', after: 'new' }],
    })
  })

  it('update sin changed_fields → mode diff con changes vacío', () => {
    const result = formatPayloadDetail({ action: 'update', payload: {} })
    expect(result).toEqual({ mode: 'diff', changes: [] })
  })

  it('create con after → mode snapshot variant create, excluye id y created_at', () => {
    const result = formatPayloadDetail({
      action: 'create',
      payload: { after: { name: 'Test', id: '1', created_at: '2024-01-01' } },
    })
    expect(result).toEqual({
      mode: 'snapshot',
      variant: 'create',
      fields: [{ field: 'name', value: 'Test' }],
    })
  })

  it('delete con before → mode snapshot variant delete', () => {
    const result = formatPayloadDetail({
      action: 'delete',
      payload: { before: { name: 'Old' } },
    })
    expect(result).toEqual({
      mode: 'snapshot',
      variant: 'delete',
      fields: [{ field: 'name', value: 'Old' }],
    })
  })

  it('role_assigned → mode relational con kind Rol', () => {
    const result = formatPayloadDetail({
      action: 'role_assigned',
      payload: { role_id: 'r1', role_name: 'Admin' },
    })
    expect(result).toMatchObject({
      mode: 'relational',
      summary: { kind: 'Rol', id: 'r1' },
    })
  })

  it('permission_added → mode relational con kind Permiso', () => {
    const result = formatPayloadDetail({
      action: 'permission_added',
      payload: { permission_id: 'p1', module: 'clients', permission_action: 'read' },
    })
    expect(result).toMatchObject({
      mode: 'relational',
      summary: { kind: 'Permiso', id: 'p1' },
    })
  })

  it('assignment_added con assignment_type → mode relational con kind Usuario y tag', () => {
    const result = formatPayloadDetail({
      action: 'assignment_added',
      payload: { user_id: 'u1', user_name: 'María', assignment_type: 'vendedor' },
    })
    expect(result).toMatchObject({
      mode: 'relational',
      summary: { kind: 'Usuario', id: 'u1', tag: 'vendedor' },
    })
  })

  it('acción desconocida → mode raw', () => {
    const result = formatPayloadDetail({ action: 'new_action' as any, payload: {} })
    expect(result).toEqual({ mode: 'raw' })
  })

  it('role_removed: mode relational con kind Rol', () => {
    const result = formatPayloadDetail({ action: 'role_removed', payload: { role_id: 'r1', role_name: 'Admin' } })
    expect(result.mode).toBe('relational')
    if (result.mode === 'relational') {
      expect(result.summary.kind).toBe('Rol')
      expect(result.summary.name).toBe('Admin')
    }
  })

  it('permission_removed: mode relational con kind Permiso', () => {
    const result = formatPayloadDetail({ action: 'permission_removed', payload: { permission_id: 'p1', module: 'clients', permission_action: 'edit' } })
    expect(result.mode).toBe('relational')
    if (result.mode === 'relational') {
      expect(result.summary.kind).toBe('Permiso')
      expect(result.summary.name).toBe('clients.edit')
    }
  })

  it('assignment_removed: mode relational con kind Usuario', () => {
    const result = formatPayloadDetail({ action: 'assignment_removed', payload: { user_id: 'u1', user_name: 'Ana', assignment_type: 'vendedor' } })
    expect(result.mode).toBe('relational')
    if (result.mode === 'relational') {
      expect(result.summary.kind).toBe('Usuario')
      expect(result.summary.name).toBe('Ana')
      expect(result.summary.tag).toBe('vendedor')
    }
  })

  it('role_assigned sin role_name en payload → usa lookup', () => {
    const lookups: AuditLookups = { ...EMPTY_LOOKUPS, rolesById: new Map([['r1', 'Admin']]) }
    const result = formatPayloadDetail({ action: 'role_assigned', payload: { role_id: 'r1' } }, lookups)
    expect(result.mode).toBe('relational')
    if (result.mode === 'relational')
      expect(result.summary.name).toBe('Admin')
  })

  it('permission_added sin module/permission_action en payload → usa lookup', () => {
    const lookups: AuditLookups = { ...EMPTY_LOOKUPS, permissionsById: new Map([['p1', { module: 'quotes', action: 'edit' }]]) }
    const result = formatPayloadDetail({ action: 'permission_added', payload: { permission_id: 'p1' } }, lookups)
    expect(result.mode).toBe('relational')
    if (result.mode === 'relational')
      expect(result.summary.name).toBe('quotes.edit')
  })

  it('assignment_added sin user_name en payload → usa lookup', () => {
    const lookups: AuditLookups = { ...EMPTY_LOOKUPS, usersById: new Map([['u1', 'Carlos Pérez']]) }
    const result = formatPayloadDetail({ action: 'assignment_added', payload: { user_id: 'u1', assignment_type: 'vendedor' } }, lookups)
    expect(result.mode).toBe('relational')
    if (result.mode === 'relational')
      expect(result.summary.name).toBe('Carlos Pérez')
  })
})
