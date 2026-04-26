import type { AuditLogEntry } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface AuditFilters {
  entity_type?: string
  actor_id?: string
  date_from?: string
  date_to?: string
  action?: string
}

export const PAGE_SIZE = 50

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditLogEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(0)

  async function fetchAll(filters: AuditFilters, pageNum = 0): Promise<void> {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('audit_log_with_actor')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (filters.entity_type)
        query = query.eq('entity_type', filters.entity_type)
      if (filters.actor_id)
        query = query.eq('actor_id', filters.actor_id)
      if (filters.date_from)
        query = query.gte('created_at', filters.date_from)
      if (filters.date_to)
        query = query.lte('created_at', filters.date_to)
      if (filters.action)
        query = query.eq('action', filters.action)

      const { data, error: dbError, count } = await query
      if (dbError)
        throw dbError
      entries.value = (data ?? []) as AuditLogEntry[]
      total.value = count ?? 0
      page.value = pageNum
    }
    catch (e: unknown) {
      // Supabase devuelve errores como objetos { message: string }, no como instancias de Error
      error.value = e instanceof Error
        ? e.message
        : (typeof e === 'object' && e !== null && 'message' in e)
            ? String((e as { message: unknown }).message)
            : String(e)
      entries.value = []
    }
    finally {
      loading.value = false
    }
  }

  async function fetchByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    const { data, error: dbError } = await supabase
      .from('audit_log_with_actor')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
    if (dbError)
      return []
    return (data ?? []) as AuditLogEntry[]
  }

  return {
    entries,
    loading,
    error,
    total,
    page,
    fetchAll,
    fetchByEntity,
  }
})
