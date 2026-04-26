import type { AuditLookups } from '@/lib/audit-format'
import type { AuditLogEntry } from '@/types'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { EMPTY_LOOKUPS } from '@/lib/audit-format'
import AuditEntryDetail from './AuditEntryDetail.vue'

// Helper para crear una entry de audit con defaults
function makeEntry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 'entry-1',
    entity_type: 'users',
    entity_id: 'entity-uuid-1234',
    action: 'create',
    actor_id: null,
    actor_name: null,
    created_at: '2026-01-01T00:00:00Z',
    payload: {},
    ...overrides,
  } as AuditLogEntry
}

const testLookups: AuditLookups = {
  rolesById: new Map([['role-1', 'Admin']]),
  permissionsById: new Map([['perm-1', { module: 'clients', action: 'read' }]]),
  usersById: new Map([['user-1', 'María García']]),
}

describe('auditEntryDetail', () => {
  it('modo diff: renderiza tabla de cambios con campos before/after', async () => {
    const entry = makeEntry({
      action: 'update',
      payload: {
        before: { name: 'Viejo' },
        after: { name: 'Nuevo' },
        changed_fields: ['name'],
      },
    })
    const wrapper = mount(AuditEntryDetail, {
      props: { entry, lookups: testLookups },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('name')
    expect(wrapper.text()).toContain('Viejo')
    expect(wrapper.text()).toContain('Nuevo')
  })

  it('modo snapshot create: renderiza campos del after excluyendo metadata', async () => {
    const entry = makeEntry({
      action: 'create',
      payload: {
        after: { name: 'Juan Pérez', email: 'j@test.com', id: 'skip-me', created_at: 'skip-too' },
      },
    })
    const wrapper = mount(AuditEntryDetail, {
      props: { entry, lookups: EMPTY_LOOKUPS },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('name')
    expect(wrapper.text()).toContain('Juan Pérez')
    expect(wrapper.text()).not.toContain('skip-me')
  })

  it('modo snapshot delete: renderiza campos del before', async () => {
    const entry = makeEntry({
      action: 'delete',
      payload: {
        before: { name: 'Registro Borrado', email: 'del@test.com' },
      },
    })
    const wrapper = mount(AuditEntryDetail, {
      props: { entry, lookups: EMPTY_LOOKUPS },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('Registro Borrado')
  })

  it('modo relacional role_assigned: muestra nombre del rol', async () => {
    const entry = makeEntry({
      action: 'role_assigned',
      entity_type: 'users',
      payload: { role_id: 'role-1' },
    })
    const wrapper = mount(AuditEntryDetail, {
      props: { entry, lookups: testLookups },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('Rol')
  })

  it('modo relacional permission_added: muestra module.action', async () => {
    const entry = makeEntry({
      action: 'permission_added',
      entity_type: 'roles',
      payload: { permission_id: 'perm-1' },
    })
    const wrapper = mount(AuditEntryDetail, {
      props: { entry, lookups: testLookups },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('clients.read')
  })

  it('modo relacional assignment_added: muestra nombre y tipo', async () => {
    const entry = makeEntry({
      action: 'assignment_added',
      entity_type: 'clients',
      payload: { user_id: 'user-1', assignment_type: 'vendedor' },
    })
    const wrapper = mount(AuditEntryDetail, {
      props: { entry, lookups: testLookups },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('María García')
    expect(wrapper.text()).toContain('vendedor')
  })

  it('modo raw: renderiza <pre> con JSON del payload para acciones desconocidas', async () => {
    const entry = makeEntry({
      action: 'unknown_action' as any,
      payload: { some_field: 'some_value' },
    })
    const wrapper = mount(AuditEntryDetail, {
      props: { entry, lookups: EMPTY_LOOKUPS },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.find('pre').exists()).toBe(true)
  })

  it('monta sin Pinia sin lanzar excepción', async () => {
    // Si el componente usara stores internamente, este test fallaría sin createPinia
    // Lo probamos montando sin providers (solo props)
    const entry = makeEntry({ action: 'create', payload: { after: { name: 'Test' } } })
    expect(() => mount(AuditEntryDetail, {
      props: { entry, lookups: EMPTY_LOOKUPS },
    })).not.toThrow()
  })
})
