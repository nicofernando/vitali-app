import { describe, expect, it } from 'vitest'
import { actionLabel, entityLabel, formatChangedFields } from './audit-format'

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
