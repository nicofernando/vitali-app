import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const usePermissionsStore = defineStore('permissions', () => {
  const permissions = ref<string[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // Prevents concurrent loads: second caller waits for the in-flight promise
  let _loadPromise: Promise<void> | null = null

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

    const data = result.data

    const perms: string[] = []
    for (const ur of data ?? []) {
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

    permissions.value = perms
    loaded.value = true
  }

  function reset() {
    permissions.value = []
    loaded.value = false
    error.value = null
    _loadPromise = null
  }

  return {
    permissions,
    loaded,
    error,
    can,
    canAny,
    load,
    reset,
  }
})
