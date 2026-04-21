import type { Client, ClientInsert, ClientUpdate } from '@/types'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

const CLIENT_COLUMNS = 'id, full_name, rut, email, phone, address, commune, created_at'

export const useClientsStore = defineStore('clients', () => {
  const clients = shallowRef<Client[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data, error: dbError } = await supabase
        .from('clients')
        .select(CLIENT_COLUMNS)
        .order('full_name')
      if (dbError)
        throw dbError
      clients.value = data ?? []
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'Error al cargar clientes')
    }
    finally {
      loading.value = false
    }
  }

  async function search(query: string): Promise<Client[]> {
    const { data, error: dbError } = await supabase.rpc('search_clients', { p_query: query })
    if (dbError)
      throw new Error(dbError.message)
    return data ?? []
  }

  async function create(payload: ClientInsert): Promise<Client> {
    const { data, error: dbError } = await supabase
      .from('clients')
      .insert(payload)
      .select(CLIENT_COLUMNS)
      .single()
    if (dbError)
      throw dbError
    clients.value.unshift(data)
    return data
  }

  async function update(id: string, payload: ClientUpdate) {
    const { data, error: dbError } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select(CLIENT_COLUMNS)
      .single()
    if (dbError)
      throw dbError
    const idx = clients.value.findIndex(c => c.id === id)
    if (idx !== -1)
      clients.value[idx] = data
  }

  async function remove(id: string) {
    const { error: dbError } = await supabase.from('clients').delete().eq('id', id)
    if (dbError)
      throw dbError
    clients.value = clients.value.filter(c => c.id !== id)
  }

  return { clients, loading, error, fetchAll, search, create, update, remove }
})
