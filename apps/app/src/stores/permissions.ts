import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const usePermissionsStore = defineStore('permissions', () => {
  const permissions = ref<string[]>([])
  const loaded = ref(false)

  function can(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function canAny(...perms: string[]): boolean {
    return perms.some(p => permissions.value.includes(p))
  }

  async function load(userId: string) {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        roles (
          role_permissions (
            permissions ( module, action )
          )
        )
      `)
      .eq('user_id', userId)

    if (error)
      throw error

    const perms: string[] = []
    for (const ur of data ?? []) {
      const role = ur.roles as any
      for (const rp of role?.role_permissions ?? []) {
        const { module, action } = rp.permissions ?? {}
        if (module && action) {
          perms.push(`${module}.${action}`)
        }
      }
    }

    permissions.value = perms
    loaded.value = true
  }

  function reset() {
    permissions.value = []
    loaded.value = false
  }

  return {
    permissions,
    loaded,
    can,
    canAny,
    load,
    reset,
  }
})
