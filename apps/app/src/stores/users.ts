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
      const [{ data: usersData, error: usersError }, { data: rolesData, error: rolesError }] = await Promise.all([
        supabase.rpc('get_users_with_roles'),
        supabase.from('user_roles').select('user_id, roles(id, name, description, created_at)'),
      ])

      if (usersError)
        throw usersError
      if (rolesError)
        throw rolesError

      const rolesByUser = new Map<string, Role[]>()
      for (const row of (rolesData ?? []) as any[]) {
        if (!row.roles)
          continue
        const userId: string = row.user_id
        if (!rolesByUser.has(userId))
          rolesByUser.set(userId, [])
        rolesByUser.get(userId)!.push(row.roles as Role)
      }

      users.value = ((usersData ?? []) as any[])
        .map(u => ({
          id: u.id as string,
          email: u.email as string,
          full_name: u.full_name as string | null,
          phone: u.phone as string | null,
          roles: rolesByUser.get(u.id) ?? [],
        }))
        .sort((a, b) => {
          if (!a.full_name && !b.full_name)
            return 0
          if (!a.full_name)
            return 1
          if (!b.full_name)
            return -1
          return a.full_name.localeCompare(b.full_name, 'es')
        })
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar usuarios')
    }
    finally {
      loading.value = false
    }
  }

  async function createUser(payload: { email: string, full_name: string | null, phone: string | null }) {
    const { error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: payload,
    })
    if (fnError)
      throw fnError
    await fetchAll()
  }

  async function updateProfile(userId: string, data: { full_name?: string | null, phone?: string | null }) {
    const { error: dbError } = await supabase
      .from('user_profiles')
      .update(data)
      .eq('user_id', userId)
    if (dbError)
      throw dbError
    const user = users.value.find(u => u.id === userId)
    if (user)
      Object.assign(user, data)
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
      if (user && !user.roles.some(r => r.id === roleId))
        user.roles.push(role)
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
    if (user)
      user.roles = user.roles.filter(r => r.id !== roleId)
  }

  async function deleteUser(userId: string) {
    const { error: fnError } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId },
    })
    if (fnError)
      throw fnError
    users.value = users.value.filter(u => u.id !== userId)
  }

  return { users, loading, error, fetchAll, createUser, updateProfile, assignRole, removeRole, deleteUser }
})
