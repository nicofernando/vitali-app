import { describe, it, expect } from 'vitest'
import { calculateSmart } from './smart.ts'

describe('calculateSmart', () => {
  it('retorna N-1 cuotas + balloon, balloon > cuota mensual', () => {
    const result = calculateSmart(100_000, 0.08, 5, 30, 20)
    expect(result.term_months).toBe(60)
    expect(result.cuotas_percentage).toBe(30)
    expect(result.balloon_percentage).toBe(50)
    expect(result.balloon_payment).toBeGreaterThan(result.cuotas_payment)
    expect(result.cuotas_payment).toBeGreaterThan(0)
  })

  it('pie + cuotas + balloon = 100%', () => {
    const pie = 20
    const cuotas = 30
    const result = calculateSmart(100_000, 0.08, 5, cuotas, pie)
    expect(result.balloon_percentage + cuotas + pie).toBeCloseTo(100, 3)
  })

  it('financing_amount = precio - PIE', () => {
    const result = calculateSmart(100_000, 0.08, 5, 30, 20)
    expect(result.financing_amount).toBeCloseTo(80_000, 1)
  })

  it('total_paid = cuotas × (n-1) + balloon', () => {
    const result = calculateSmart(100_000, 0.08, 5, 30, 20)
    const expected = result.cuotas_payment * (result.term_months - 1) + result.balloon_payment
    expect(result.total_paid).toBeCloseTo(expected, 1)
  })

  it('lanza error si PIE >= 100%', () => {
    expect(() => calculateSmart(100_000, 0.08, 5, 30, 100)).toThrow('PIE')
  })

  it('lanza error si cuotas_percentage <= 0', () => {
    expect(() => calculateSmart(100_000, 0.08, 5, 0, 20)).toThrow('cuotas')
  })

  it('lanza error si balloon resulta negativo (PIE + cuotas > 100%)', () => {
    expect(() => calculateSmart(100_000, 0.08, 5, 50, 60)).toThrow('balloon')
  })

  it('lanza error si plazo es 0', () => {
    expect(() => calculateSmart(100_000, 0.08, 0, 30, 20)).toThrow('plazo')
  })
})
