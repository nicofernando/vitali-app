import { describe, it, expect } from 'vitest'
import { calculateFrench } from './french.ts'

describe('calculateFrench', () => {
  it('calcula cuota correctamente (caso conocido $100k, 8%, 20 años)', () => {
    const result = calculateFrench(100_000, 0.08, 20)
    expect(result.monthly_payment).toBeCloseTo(836.44, 0)
    expect(result.term_months).toBe(240)
    expect(result.financing_amount).toBe(100_000)
  })

  it('tasa mensual es tasa_anual / 12', () => {
    const result = calculateFrench(50_000, 0.12, 10)
    expect(result.monthly_rate).toBeCloseTo(0.12 / 12, 10)
  })

  it('total_paid es cuota × n', () => {
    const result = calculateFrench(100_000, 0.08, 20)
    expect(result.total_paid).toBeCloseTo(result.monthly_payment * result.term_months, 1)
  })

  it('capital 0 retorna cuota 0', () => {
    const result = calculateFrench(0, 0.08, 20)
    expect(result.monthly_payment).toBe(0)
    expect(result.total_paid).toBe(0)
  })

  it('lanza error si plazo es 0', () => {
    expect(() => calculateFrench(100_000, 0.08, 0)).toThrow('plazo')
  })

  it('lanza error si tasa es negativa', () => {
    expect(() => calculateFrench(100_000, -0.01, 20)).toThrow('tasa')
  })

  it('tasa 0%: divide en cuotas iguales sin interés', () => {
    const result = calculateFrench(12_000, 0, 1)
    expect(result.monthly_payment).toBeCloseTo(1000, 1)
  })

  it('lanza error si principal es negativo', () => {
    expect(() => calculateFrench(-1, 0.08, 20)).toThrow('El monto a financiar no puede ser negativo')
  })
})
