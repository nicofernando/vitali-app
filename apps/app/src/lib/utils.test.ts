import { describe, expect, it } from 'vitest'
import { cn, extractErrorMessage } from './utils'

describe('extractErrorMessage', () => {
  it('retorna message de una instancia de Error', () => {
    expect(extractErrorMessage(new Error('algo salió mal'))).toBe('algo salió mal')
  })

  it('retorna message de un objeto con propiedad message (ej. error de Supabase)', () => {
    expect(extractErrorMessage({ message: 'RLS violation' })).toBe('RLS violation')
  })

  it('retorna el fallback por defecto para valores desconocidos', () => {
    expect(extractErrorMessage(null)).toBe('Error inesperado')
    expect(extractErrorMessage(undefined)).toBe('Error inesperado')
    expect(extractErrorMessage(42)).toBe('Error inesperado')
  })

  it('retorna el fallback personalizado cuando se provee', () => {
    expect(extractErrorMessage(null, 'Error de red')).toBe('Error de red')
  })

  it('ignora objetos con message no-string', () => {
    expect(extractErrorMessage({ message: 123 })).toBe('Error inesperado')
  })
})

describe('cn', () => {
  it('combina clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resuelve conflictos de Tailwind (la última clase gana)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('ignora valores falsy', () => {
    expect(cn('foo', false && 'bar', undefined, null, 'baz')).toBe('foo baz')
  })

  it('maneja clases condicionales con objetos', () => {
    expect(cn({ 'font-bold': true, 'italic': false })).toBe('font-bold')
  })
})
