import type { Session, User } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!session.value)

  async function initialize() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
    })
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError)
        throw authError
      session.value = data.session
      user.value = data.user
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
    await supabase.auth.signOut()
    session.value = null
    user.value = null
  }

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    initialize,
    login,
    logout,
  }
})
