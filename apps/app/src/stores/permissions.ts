import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

// Supabase nested joins return object or array depending on cardinality.
// We normalize both shapes to extract a flat list of "module.action" strings.
function extractPermissionsFromRoles(data: any[]): string[] {
  const perms: string[] = []
  for (const ur of data) {
    const role = ur.roles as any
    const rolePermissions = Array.isArray(role?.role_permissions)
      ? role.role_permissions
      : role?.role_permissions
        ? [role.role_permissions]
        : []

    for (const rp of rolePermissions) {
      const perm = Array.isArray(rp?.permissions) ? rp.permissions[0] : rp?.permissions
      const { module, action } = perm ?? {}
      if (module && action)
        perms.push(`${module}.${action}`)
    }
  }
  return perms
}

export const usePermissionsStore = defineStore('permissions', () => {
  const permissions = ref<string[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)
  const permissionsChanged = ref(false)

  // Prevents concurrent loads: second caller waits for the in-flight promise
  let _loadPromise: Promise<void> | null = null
  let _realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  function can(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function canAny(...perms: string[]): boolean {
    return perms.some(p => permissions.value.includes(p))
  }

  async function load(userId: string): Promise<void> {
    if (_loadPromise)
      return _loadPromise

    _loadPromise = _doLoad(userId).finally(() => {
      _loadPromise = null
    })

    return _loadPromise
  }

  async function _doLoad(userId: string): Promise<void> {
    error.value = null
    const result = await supabase
      .from('user_roles')
      .select(`
        roles (
          role_permissions (
            permissions ( module, action )
          )
        )
      `)
      .eq('user_id', userId)

    if (result.error) {
      error.value = result.error.message
      loaded.value = true // mark loaded so the guard doesn't loop forever
      return
    }

    permissions.value = extractPermissionsFromRoles(result.data ?? [])
    loaded.value = true

    _subscribeRealtime(userId)
  }

  function _subscribeRealtime(userId: string): void {
    if (_realtimeChannel)
      return

    _realtimeChannel = supabase
      .channel(`user_roles_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${userId}` },
        async () => {
          const prev = [...permissions.value]
          await reload(userId)
          const next = permissions.value
          if (JSON.stringify(prev.sort()) !== JSON.stringify([...next].sort())) {
            permissionsChanged.value = true
          }
        },
      )
      .subscribe()
  }

  function reset() {
    permissions.value = []
    loaded.value = false
    error.value = null
    permissionsChanged.value = false
    _loadPromise = null
    if (_realtimeChannel) {
      supabase.removeChannel(_realtimeChannel)
      _realtimeChannel = null
    }
  }

  async function reload(userId: string): Promise<void> {
    loaded.value = false
    return load(userId)
  }

  function dismissChange() {
    permissionsChanged.value = false
  }

  return {
    permissions,
    loaded,
    error,
    permissionsChanged,
    can,
    canAny,
    load,
    reload,
    reset,
    dismissChange,
  }
})
