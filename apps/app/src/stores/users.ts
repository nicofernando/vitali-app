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
        .select('id, email, full_name, phone, user_roles(roles(id, name, description, created_at))')
        .order('full_name', { nullsFirst: false })

      if (dbError)
        throw dbError
      users.value = (data ?? []).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        phone: u.phone,
        roles: (u.user_roles ?? []).map((r: any) => r.roles).filter(Boolean),
      }))
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

  return { users, loading, error, fetchAll, createUser, updateProfile, assignRole, removeRole }
})
