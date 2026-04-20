import { describe, expect, it } from 'vitest'
import { calculateSmart } from './smart.ts'

describe('calculateSmart', () => {
  it('pie + cuotas + balloon = 100%', () => {
    const result = calculateSmart(100_000, 0.08, 5, 30, 20)
    expect(result.balloon_percentage + 30 + 20).toBeCloseTo(100, 3)
  })

  it('financing_amount = precio - PIE', () => {
    const result = calculateSmart(100_000, 0.08, 5, 30, 20)
    expect(result.financing_amount).toBeCloseTo(80_000, 1)
  })

  it('total_paid = cuotas × (n-1) + balloon_payment', () => {
    const result = calculateSmart(100_000, 0.08, 5, 30, 20)
    const expected = result.cuotas_payment * (result.term_months - 1) + result.balloon_payment
    expect(result.total_paid).toBeCloseTo(expected, 1)
  })

  it('cuando balloon = 0%, balloon_payment es igual a la cuota mensual', () => {
    // PIE 10% + cuotas 90% = 100% → balloon 0%
    const result = calculateSmart(100_000, 0.08, 5, 90, 10)
    expect(result.balloon_percentage).toBe(0)
    expect(result.balloon_payment).toBeCloseTo(result.cuotas_payment, 1)
  })

  it('cuando balloon = 0%, todas las cuotas son iguales (sin balloon extra)', () => {
    const result = calculateSmart(200_000, 0.06, 10, 80, 20)
    expect(result.balloon_percentage).toBe(0)
    // total = N cuotas iguales, no hay monto extra
    expect(result.total_paid).toBeCloseTo(result.cuotas_payment * result.term_months, 1)
  })

  it('cuota mensual aumenta si el porcentaje de cuotas es mayor', () => {
    const low = calculateSmart(100_000, 0.08, 5, 30, 20)
    const high = calculateSmart(100_000, 0.08, 5, 60, 20)
    expect(high.cuotas_payment).toBeGreaterThan(low.cuotas_payment)
  })

  it('balloon_payment = cuota + monto balloon cuando balloon > 0', () => {
    // PIE 20%, cuotas 30%, balloon 50%
    const result = calculateSmart(100_000, 0.08, 5, 30, 20)
    const balloonAmount = 100_000 * 0.50
    expect(result.balloon_payment).toBeCloseTo(result.cuotas_payment + balloonAmount, 1)
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
