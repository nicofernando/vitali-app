import type { Permission } from '@/types'
import { describe, expect, it } from 'vitest'
import {
  groupPermissionsByModule,
  isModuleFullySelected,
  toggleModule,
} from './roles-permissions'

function makePermission(module: string, action: string): Permission {
  return { id: `${module}-${action}`, module, action, description: '' }
}

const perms: Permission[] = [
  makePermission('clients', 'read'),
  makePermission('clients', 'create'),
  makePermission('clients', 'edit'),
  makePermission('quotes', 'read'),
  makePermission('quotes', 'create'),
]

describe('groupPermissionsByModule', () => {
  it('agrupa por module correctamente', () => {
    const groups = groupPermissionsByModule(perms)
    expect(Object.keys(groups).sort()).toEqual(['clients', 'quotes'])
    expect(groups.clients).toHaveLength(3)
    expect(groups.quotes).toHaveLength(2)
  })

  it('retorna objeto vacío para array vacío', () => {
    expect(groupPermissionsByModule([])).toEqual({})
  })

  it('cada entrada tiene el module correcto', () => {
    const groups = groupPermissionsByModule(perms)
    groups.clients.forEach(p => expect(p.module).toBe('clients'))
  })
})

describe('isModuleFullySelected', () => {
  it('retorna true si todos los permisos del módulo están seleccionados', () => {
    const selected = ['clients-read', 'clients-create', 'clients-edit']
    expect(isModuleFullySelected('clients', selected, perms)).toBe(true)
  })

  it('retorna false si falta al menos uno', () => {
    const selected = ['clients-read', 'clients-create']
    expect(isModuleFullySelected('clients', selected, perms)).toBe(false)
  })

  it('retorna false si no hay ninguno seleccionado', () => {
    expect(isModuleFullySelected('clients', [], perms)).toBe(false)
  })

  it('retorna false para módulo inexistente', () => {
    expect(isModuleFullySelected('unknown', ['x'], perms)).toBe(false)
  })
})

describe('toggleModule', () => {
  it('agrega todos los permisos del módulo cuando checked=true', () => {
    const result = toggleModule('quotes', [], perms, true)
    expect(result).toContain('quotes-read')
    expect(result).toContain('quotes-create')
  })

  it('remueve todos los permisos del módulo cuando checked=false', () => {
    const selected = ['quotes-read', 'quotes-create', 'clients-read']
    const result = toggleModule('quotes', selected, perms, false)
    expect(result).not.toContain('quotes-read')
    expect(result).not.toContain('quotes-create')
    expect(result).toContain('clients-read')
  })

  it('no duplica IDs al agregar módulo ya parcialmente seleccionado', () => {
    const selected = ['quotes-read']
    const result = toggleModule('quotes', selected, perms, true)
    const quotesIds = result.filter(id => id.startsWith('quotes'))
    expect(quotesIds.length).toBe(new Set(quotesIds).size)
    expect(quotesIds).toHaveLength(2)
  })

  it('no modifica otros módulos al hacer toggle', () => {
    const selected = ['clients-read', 'clients-create', 'clients-edit']
    const result = toggleModule('quotes', selected, perms, true)
    expect(result).toContain('clients-read')
    expect(result).toContain('clients-create')
    expect(result).toContain('clients-edit')
  })
})
