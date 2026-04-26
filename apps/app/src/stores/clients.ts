import type { Client, ClientInsert, ClientUpdate } from '@/types'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { supabase } from '@/lib/supabase'
import { extractErrorMessage } from '@/lib/utils'

const CLIENT_COLUMNS = 'id, full_name, rut, email, phone, phone_country_code, address, commune, created_at, created_by'

export const useClientsStore = defineStore('clients', () => {
  const clients = shallowRef<Client[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasFetched = ref(false)

  async function fetchAll() {
    if (hasFetched.value)
      return
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
      hasFetched.value = true
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
    clients.value = [data, ...clients.value]
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
    clients.value = clients.value.map(c => c.id === id ? data : c)
  }

  async function remove(id: string) {
    const { error: dbError } = await supabase.from('clients').delete().eq('id', id)
    if (dbError)
      throw dbError
    clients.value = clients.value.filter(c => c.id !== id)
  }

  return { clients, loading, error, hasFetched, fetchAll, search, create, update, remove }
})
