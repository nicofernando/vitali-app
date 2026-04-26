import type { Client } from '@/types'
import { describe, expect, it } from 'vitest'
import { filterClients } from './clients-filter'

const base: Client = {
  id: 'cl1',
  full_name: 'Juan Pérez',
  rut: '12345678-9',
  address: 'Av. Providencia 1234',
  commune: 'Providencia',
  phone_country_code: '+56',
  phone: '912345678',
  email: 'juan@test.com',
  created_by: 'u1',
  created_at: '2026-01-01T00:00:00Z',
}

const withNulls: Client = {
  id: 'cl2',
  full_name: 'María González',
  rut: null,
  address: null,
  commune: null,
  phone_country_code: '+54',
  phone: null,
  email: null,
  created_by: 'u1',
  created_at: '2026-01-01T00:00:00Z',
}

const clients = [base, withNulls]

describe('filterClients', () => {
  // ── Query vacío ───────────────────────────────────────────────
  it('retorna todos cuando la query está vacía', () => {
    expect(filterClients(clients, '')).toEqual(clients)
  })

  it('retorna todos cuando la query es solo espacios', () => {
    expect(filterClients(clients, '   ')).toEqual(clients)
  })

  // ── Nombre ────────────────────────────────────────────────────
  it('busca por full_name (case insensitive)', () => {
    expect(filterClients(clients, 'juan')).toEqual([base])
    expect(filterClients(clients, 'JUAN')).toEqual([base])
    expect(filterClients(clients, 'Pérez')).toEqual([base])
    expect(filterClients(clients, 'maría')).toEqual([withNulls])
  })

  // ── Email ─────────────────────────────────────────────────────
  it('busca por email (case insensitive)', () => {
    expect(filterClients(clients, 'juan@test')).toEqual([base])
    expect(filterClients(clients, 'JUAN@TEST')).toEqual([base])
  })

  it('no falla cuando el email es null', () => {
    expect(filterClients([withNulls], 'test@')).toEqual([])
  })

  // ── Comuna ────────────────────────────────────────────────────
  it('busca por commune (case insensitive)', () => {
    expect(filterClients(clients, 'providencia')).toEqual([base])
    expect(filterClients(clients, 'PROV')).toEqual([base])
  })

  it('no falla cuando la commune es null', () => {
    expect(filterClients([withNulls], 'providencia')).toEqual([])
  })

  // ── RUT ───────────────────────────────────────────────────────
  it('busca RUT formateado con puntos y guión', () => {
    expect(filterClients(clients, '12.345.678-9')).toEqual([base])
  })

  it('busca RUT con guión pero sin puntos', () => {
    expect(filterClients(clients, '12345678-9')).toEqual([base])
  })

  it('busca RUT solo con dígitos del cuerpo', () => {
    expect(filterClients(clients, '12345678')).toEqual([base])
  })

  it('busca RUT con dígitos parciales', () => {
    expect(filterClients(clients, '12345')).toEqual([base])
  })

  it('no falla cuando el rut es null', () => {
    expect(filterClients([withNulls], '12345')).toEqual([])
  })

  // ── Teléfono ──────────────────────────────────────────────────
  it('busca por número de teléfono local', () => {
    expect(filterClients(clients, '912345678')).toEqual([base])
  })

  it('busca por teléfono con código de país (con +)', () => {
    expect(filterClients(clients, '+56912345678')).toEqual([base])
  })

  it('busca por teléfono con código de país (sin +)', () => {
    expect(filterClients(clients, '56912345678')).toEqual([base])
  })

  it('busca por teléfono ignorando espacios y guiones', () => {
    expect(filterClients(clients, '9 1234 5678')).toEqual([base])
    expect(filterClients(clients, '9-1234-5678')).toEqual([base])
  })

  it('no falla cuando el teléfono es null', () => {
    expect(filterClients([withNulls], '912345678')).toEqual([])
  })

  // ── Sin resultados ────────────────────────────────────────────
  it('retorna lista vacía cuando nada coincide', () => {
    expect(filterClients(clients, 'xyzxyz')).toEqual([])
  })

  // ── Regresión: punto en nombre no rompe la búsqueda por nombre ─
  it('busca nombres con punto sin confundirlos con RUT (Sr. García)', () => {
    const conPunto: Client = { ...base, id: 'cl3', full_name: 'Sr. García' }
    expect(filterClients([conPunto], 'sr.')).toEqual([conPunto])
    expect(filterClients([conPunto], 'sr. garcía')).toEqual([conPunto])
  })

  // ── Lista vacía ───────────────────────────────────────────────
  it('retorna lista vacía si clients es vacío', () => {
    expect(filterClients([], 'juan')).toEqual([])
  })
})
