import type { Session, User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { usePermissionsStore } from '@/stores/permissions'

let _subscription: { unsubscribe: () => void } | null = null

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!session.value)

  async function fetchProfile(userId: string): Promise<void> {
    const { data, error: dbError } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, phone, created_at')
      .eq('user_id', userId)
      .single()
    if (dbError) {
      console.warn('[auth] fetchProfile error:', dbError.message)
      return
    }
    profile.value = data as UserProfile
  }

  // Aplica una sesión al estado local: actualiza user/session y carga el perfil.
  // Centralizar esto evita duplicar la misma lógica en el listener y en initialize().
  async function applySession(newSession: Session | null): Promise<void> {
    session.value = newSession
    user.value = newSession?.user ?? null
    if (newSession?.user)
      await fetchProfile(newSession.user.id)
    else
      profile.value = null
  }

  async function initialize() {
    // El listener se registra antes de getSession() para capturar cualquier
    // cambio de auth (refresh, sign-out) que ocurra durante la inicialización.
    if (!_subscription) {
      const { data: listenerData } = supabase.auth.onAuthStateChange(
        (_event, newSession) => { applySession(newSession) },
      )
      _subscription = listenerData.subscription
    }

    const { data } = await supabase.auth.getSession()
    await applySession(data.session)
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError)
        throw authError
      await applySession(data.session)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al iniciar sesión'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function logout() {
    usePermissionsStore().reset()
    await supabase.auth.signOut()
    session.value = null
    user.value = null
    profile.value = null
  }

  return {
    user,
    session,
    profile,
    loading,
    error,
    isAuthenticated,
    initialize,
    login,
    logout,
  }
})
