import type { Client } from '@/types'

// La búsqueda normaliza cada campo de forma distinta según su naturaleza:
// - Texto libre (nombre, email, comuna): solo lowercase
// - RUT: se eliminan puntos y guión para comparar dígitos directamente
// - Teléfono: se eliminan espacios, guiones y paréntesis; se busca también
//   con el prefijo de país para que "+56 9 1234 5678" encuentre al cliente

function stripRutFormatting(s: string): string {
  return s.replace(/[.\-]/g, '')
}

function stripPhoneFormatting(s: string): string {
  return s.replace(/[\s\-()]/g, '')
}

function matchesText(value: string | null, q: string): boolean {
  return (value ?? '').toLowerCase().includes(q)
}

function matchesRut(rut: string | null, q: string): boolean {
  return stripRutFormatting(rut ?? '').toLowerCase().includes(stripRutFormatting(q))
}

function matchesPhone(phone: string | null, countryCode: string, q: string): boolean {
  const nq = stripPhoneFormatting(q)
  const local = stripPhoneFormatting(phone ?? '')
  const withPrefix = stripPhoneFormatting(`${countryCode}${phone ?? ''}`)
  return local.includes(nq) || withPrefix.includes(nq)
}

export function filterClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase()
  if (!q)
    return clients

  return clients.filter(c =>
    matchesText(c.full_name, q)
    || matchesText(c.email, q)
    || matchesText(c.commune, q)
    || matchesRut(c.rut, q)
    || matchesPhone(c.phone, c.phone_country_code, q),
  )
}
