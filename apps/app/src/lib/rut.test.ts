import { describe, expect, it } from 'vitest'
import { formatRut, normalizeRut, validateRut } from './rut'

describe('validateRut', () => {
  // ── RUTs válidos con formato estándar ──────────────────────────
  it('acepta RUT válido con puntos y guión (12.345.678-5)', () => {
    expect(validateRut('12.345.678-5')).toBe(true)
  })

  it('acepta RUT válido sin formato (12345678-5)', () => {
    expect(validateRut('12345678-5')).toBe(true)
  })

  it('acepta RUT de 8 dígitos homogéneo (11.111.111-1)', () => {
    expect(validateRut('11.111.111-1')).toBe(true)
  })

  it('acepta RUT de 8 dígitos homogéneo (22.222.222-2)', () => {
    expect(validateRut('22222222-2')).toBe(true)
  })

  it('acepta RUT con dígito verificador K (6-K)', () => {
    // 6×2=12, 12%11=1, check=K
    expect(validateRut('6-K')).toBe(true)
  })

  it('acepta RUT con dígito K en minúscula (6-k)', () => {
    expect(validateRut('6-k')).toBe(true)
  })

  it('acepta RUT corto de 1 dígito en cuerpo (1-9)', () => {
    // 1×2=2, 2%11=2, 11-2=9
    expect(validateRut('1-9')).toBe(true)
  })

  it('acepta RUT de 7 dígitos (7.654.321-6)', () => {
    // 1×2+2×3+3×4+4×5+5×6+6×7+7×2=126, 126%11=5, check=11-5=6
    expect(validateRut('7.654.321-6')).toBe(true)
  })

  // ── RUTs inválidos ─────────────────────────────────────────────
  it('rechaza RUT con dígito verificador incorrecto (12.345.678-9)', () => {
    expect(validateRut('12.345.678-9')).toBe(false)
  })

  it('rechaza RUT con dígito verificador incorrecto (11.111.111-2)', () => {
    expect(validateRut('11111111-2')).toBe(false)
  })

  it('rechaza RUT vacío', () => {
    expect(validateRut('')).toBe(false)
  })

  it('rechaza RUT de 1 carácter solo', () => {
    expect(validateRut('1')).toBe(false)
  })

  it('rechaza RUT con letras en el cuerpo (ABC123-5)', () => {
    expect(validateRut('ABC123-5')).toBe(false)
  })

  it('rechaza RUT con más de 9 dígitos totales (123456789-5)', () => {
    expect(validateRut('123456789-5')).toBe(false)
  })

  it('rechaza RUT con dígito verificador inválido (12345678-X)', () => {
    expect(validateRut('12345678-X')).toBe(false)
  })

  it('rechaza RUT con solo puntos y guiones sin dígitos', () => {
    expect(validateRut('...-')).toBe(false)
  })
})

describe('normalizeRut', () => {
  it('elimina puntos y preserva guión (12.345.678-5 → 12345678-5)', () => {
    expect(normalizeRut('12.345.678-5')).toBe('12345678-5')
  })

  it('no modifica RUT ya normalizado (12345678-5)', () => {
    expect(normalizeRut('12345678-5')).toBe('12345678-5')
  })

  it('pone K en mayúscula (6-k → 6-K)', () => {
    expect(normalizeRut('6-k')).toBe('6-K')
  })

  it('normaliza RUT corto (1-9)', () => {
    expect(normalizeRut('1-9')).toBe('1-9')
  })

  it('agrega guión si no lo tiene (123456785 → 12345678-5)', () => {
    expect(normalizeRut('123456785')).toBe('12345678-5')
  })
})

describe('formatRut', () => {
  it('formatea RUT normalizado (12345678-5 → 12.345.678-5)', () => {
    expect(formatRut('12345678-5')).toBe('12.345.678-5')
  })

  it('es idempotente con RUT ya formateado (12.345.678-5)', () => {
    expect(formatRut('12.345.678-5')).toBe('12.345.678-5')
  })

  it('formatea RUT de 7 dígitos (7654321-6 → 7.654.321-6)', () => {
    expect(formatRut('7654321-6')).toBe('7.654.321-6')
  })

  it('formatea RUT de 6 dígitos (654321-X)', () => {
    expect(formatRut('654321-0')).toBe('654.321-0')
  })

  it('preserva K mayúscula (6-K)', () => {
    expect(formatRut('6-K')).toBe('6-K')
  })

  it('sube K minúscula (6-k → 6-K)', () => {
    expect(formatRut('6-k')).toBe('6-K')
  })

  it('formatea RUT corto de 1 dígito (1-9)', () => {
    expect(formatRut('1-9')).toBe('1-9')
  })
})
