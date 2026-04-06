import { assertEquals, assertAlmostEquals, assertThrows } from 'jsr:@std/assert'
import { calculateSmart } from './smart.ts'

Deno.test('crédito inteligente: N-1 cuotas más balloon final', () => {
  // $100,000 precio, PIE 20%, cuotas 30%, balloon 50%
  // cuotas_amount = 30,000; balloon_amount = 50,000
  // plazo: 5 años = 60 meses
  const result = calculateSmart(100_000, 0.08, 5, 30, 20)

  assertEquals(result.term_months, 60)
  assertEquals(result.cuotas_percentage, 30)
  assertEquals(result.balloon_percentage, 50)
  assertAlmostEquals(result.financing_amount, 80_000, 0.01) // 100k - 20% PIE
  // balloon debe ser mayor a la cuota mensual
  assertEquals(result.balloon_payment > result.cuotas_payment, true)
  // las cuotas deben ser positivas
  assertEquals(result.cuotas_payment > 0, true)
})

Deno.test('crédito inteligente: pie + cuotas + balloon = 100%', () => {
  const piePerc = 20
  const cuotasPerc = 30
  const result = calculateSmart(100_000, 0.08, 5, cuotasPerc, piePerc)

  assertAlmostEquals(result.balloon_percentage + cuotasPerc + piePerc, 100, 0.001)
})

Deno.test('crédito inteligente: total_paid incluye cuotas + balloon', () => {
  const result = calculateSmart(100_000, 0.08, 5, 30, 20)
  const expected = result.cuotas_payment * (result.term_months - 1) + result.balloon_payment
  assertAlmostEquals(result.total_paid, expected, 0.01)
})

Deno.test('crédito inteligente: lanza error si PIE >= 100%', () => {
  assertThrows(
    () => calculateSmart(100_000, 0.08, 5, 30, 100),
    Error,
    'PIE',
  )
})

Deno.test('crédito inteligente: lanza error si cuotas_percentage <= 0', () => {
  assertThrows(
    () => calculateSmart(100_000, 0.08, 5, 0, 20),
    Error,
    'cuotas',
  )
})

Deno.test('crédito inteligente: lanza error si balloon resulta negativo', () => {
  // PIE 60% + cuotas 50% = 110% → balloon negativo
  assertThrows(
    () => calculateSmart(100_000, 0.08, 5, 50, 60),
    Error,
    'balloon',
  )
})

Deno.test('crédito inteligente: lanza error si plazo es 0', () => {
  assertThrows(
    () => calculateSmart(100_000, 0.08, 0, 30, 20),
    Error,
    'plazo',
  )
})
