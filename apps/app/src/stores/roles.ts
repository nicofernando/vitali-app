import type { Permission, RoleWithPermissions } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<RoleWithPermissions[]>([])
  const allPermissions = ref<Permission[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasFetched = ref(false)
  const hasPermissionsFetched = ref(false)

  async function fetchAll(force = false): Promise<void> {
    if (hasFetched.value && !force)
      return
    loading.value = true
    error.value = null
    try {
      const { data, error: rpcError } = await supabase.rpc('get_roles_with_permissions')
      if (rpcError)
        throw rpcError
      roles.value = data as RoleWithPermissions[]
      hasFetched.value = true
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : (e as { message: string }).message
    }
    finally {
      loading.value = false
    }
  }

  async function fetchPermissions(): Promise<void> {
    if (hasPermissionsFetched.value)
      return
    error.value = null
    const { data, error: dbError } = await supabase.from('permissions').select('*')
    if (dbError) {
      error.value = dbError.message
      return
    }
    allPermissions.value = data as Permission[]
    hasPermissionsFetched.value = true
  }

  async function createRole(
    name: string,
    description: string | null,
    permissionIds: string[],
  ): Promise<string> {
    const { data, error: rpcError } = await supabase.rpc('create_role', {
      p_name: name,
      p_description: description,
      p_permission_ids: permissionIds,
    })
    if (rpcError)
      throw new Error(rpcError.message)
    await fetchAll(true)
    return data as string
  }

  async function updateRole(
    roleId: string,
    name: string,
    description: string | null,
    permissionIds: string[],
  ): Promise<void> {
    const { error: rpcError } = await supabase.rpc('update_role', {
      p_role_id: roleId,
      p_name: name,
      p_description: description,
      p_permission_ids: permissionIds,
    })
    if (rpcError)
      throw new Error(rpcError.message)
    await fetchAll(true)
  }

  async function deleteRole(roleId: string): Promise<void> {
    const { error: rpcError } = await supabase.rpc('delete_role', { p_role_id: roleId })
    if (rpcError)
      throw new Error(rpcError.message)
    roles.value = roles.value.filter(r => r.id !== roleId)
  }

  return {
    roles,
    allPermissions,
    loading,
    error,
    fetchAll,
    fetchPermissions,
    createRole,
    updateRole,
    deleteRole,
  }
})
