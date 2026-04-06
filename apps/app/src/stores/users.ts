import type { Role, UserWithRoles } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

export const useUsersStore = defineStore('users', () => {
  const users = ref<UserWithRoles[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data, error: dbError } = await supabase
        .from('users_with_roles')
        .select('id, email, full_name, roles:user_roles(role:roles(id, name, description, created_at))')
        .order('full_name')

      if (dbError)
        throw dbError
      // Aplanar la relación roles[{role: {...}}] → roles[{...}]
      users.value = (data ?? []).map((u: any) => ({
        ...u,
        roles: (u.roles ?? []).map((r: any) => r.role ?? r),
      }))
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar usuarios')
    }
    finally {
      loading.value = false
    }
  }

  async function assignRole(userId: string, roleId: string, role?: Role) {
    const { error: rpcError } = await supabase.rpc('assign_role', {
      p_user_id: userId,
      p_role_id: roleId,
    })
    if (rpcError)
      throw rpcError

    if (role) {
      const user = users.value.find(u => u.id === userId)
      if (user && !user.roles.some(r => r.id === roleId)) {
        user.roles.push(role)
      }
    }
  }

  async function removeRole(userId: string, roleId: string) {
    const { error: rpcError } = await supabase.rpc('remove_role', {
      p_user_id: userId,
      p_role_id: roleId,
    })
    if (rpcError)
      throw rpcError

    const user = users.value.find(u => u.id === userId)
    if (user) {
      user.roles = user.roles.filter(r => r.id !== roleId)
    }
  }

  return { users, loading, error, fetchAll, assignRole, removeRole }
})
