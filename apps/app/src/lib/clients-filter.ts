import type { Client } from '@/types'

export function filterClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase()
  if (!q)
    return clients

  const qRut = q.replace(/[.\-]/g, '')
  const qPhone = q.replace(/[\s\-()]/g, '')

  return clients.filter(c =>
    c.full_name.toLowerCase().includes(q)
    || (c.email ?? '').toLowerCase().includes(q)
    || (c.commune ?? '').toLowerCase().includes(q)
    || (c.rut ?? '').replace(/[.\-]/g, '').toLowerCase().includes(qRut)
    || (c.phone ?? '').replace(/[\s\-()]/g, '').includes(qPhone)
    || `${c.phone_country_code}${c.phone ?? ''}`.replace(/[\s\-()]/g, '').includes(qPhone),
  )
}
