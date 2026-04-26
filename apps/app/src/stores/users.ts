import type { Role, UserWithRoles } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

// Nulls sort to the bottom — users without a name appear after named users
function compareUsersByName(
  a: { full_name: string | null },
  b: { full_name: string | null },
): number {
  if (!a.full_name && !b.full_name)
    return 0
  if (!a.full_name)
    return 1
  if (!b.full_name)
    return -1
  return a.full_name.localeCompare(b.full_name, 'es')
}

export const useUsersStore = defineStore('users', () => {
  const users = ref<UserWithRoles[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasFetched = ref(false)

  async function fetchAll() {
    if (hasFetched.value)
      return
    loading.value = true
    error.value = null
    try {
      const [{ data: usersData, error: usersError }, { data: rolesData, error: rolesError }] = await Promise.all([
        supabase.rpc('get_users_with_roles'),
        supabase.from('user_roles').select('user_id, roles(id, name, description, is_system, created_at)'),
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
          is_active: u.is_active !== false,
          roles: rolesByUser.get(u.id) ?? [],
        }))
        .sort(compareUsersByName)
      hasFetched.value = true
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
    hasFetched.value = false
    await fetchAll()
  }

  async function updateProfile(userId: string, data: { full_name?: string | null, phone?: string | null }) {
    // Usamos upsert para que si el usuario no tiene fila en user_profiles
    // (ej: usuarios creados antes del trigger on_auth_user_created) se cree
    // automáticamente en lugar de fallar silenciosamente con 0 rows afectadas.
    const { error: dbError } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...data }, { onConflict: 'user_id' })
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

    const user = users.value.find(u => u.id === userId)
    if (user)
      user.roles = role ? [role] : []
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

  async function toggleUser(userId: string, enable: boolean) {
    const { error: fnError } = await supabase.functions.invoke('admin-toggle-user', {
      body: { user_id: userId, enable },
    })
    if (fnError)
      throw fnError
    const user = users.value.find(u => u.id === userId)
    if (user)
      user.is_active = enable
  }

  async function deleteUser(userId: string) {
    const { error: fnError } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId },
    })
    if (fnError)
      throw fnError
    users.value = users.value.filter(u => u.id !== userId)
  }

  return { users, loading, error, hasFetched, fetchAll, createUser, updateProfile, assignRole, removeRole, toggleUser, deleteUser }
})
