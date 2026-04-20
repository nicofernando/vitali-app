import { assertEquals, assertAlmostEquals, assertThrows } from 'jsr:@std/assert'
import { calculateSmart } from './smart.ts'

Deno.test('crédito inteligente: pie + cuotas + balloon = 100%', () => {
  const result = calculateSmart(100_000, 0.08, 5, 30, 20)
  assertAlmostEquals(result.balloon_percentage + 30 + 20, 100, 0.001)
})

Deno.test('crédito inteligente: financing_amount = precio - PIE', () => {
  const result = calculateSmart(100_000, 0.08, 5, 30, 20)
  assertAlmostEquals(result.financing_amount, 80_000, 0.01)
})

Deno.test('crédito inteligente: total_paid = cuotas × (n-1) + balloon_payment', () => {
  const result = calculateSmart(100_000, 0.08, 5, 30, 20)
  const expected = result.cuotas_payment * (result.term_months - 1) + result.balloon_payment
  assertAlmostEquals(result.total_paid, expected, 0.01)
})

Deno.test('crédito inteligente: con balloon = 0%, balloon_payment es igual a la cuota mensual', () => {
  // PIE 10% + cuotas 90% = 100% → balloon 0%
  const result = calculateSmart(100_000, 0.08, 5, 90, 10)
  assertEquals(result.balloon_percentage, 0)
  assertAlmostEquals(result.balloon_payment, result.cuotas_payment, 0.01)
})

Deno.test('crédito inteligente: con balloon = 0%, total = N cuotas iguales', () => {
  const result = calculateSmart(200_000, 0.06, 10, 80, 20)
  assertEquals(result.balloon_percentage, 0)
  assertAlmostEquals(result.total_paid, result.cuotas_payment * result.term_months, 0.01)
})

Deno.test('crédito inteligente: balloon_payment = cuota + monto balloon cuando balloon > 0', () => {
  // PIE 20%, cuotas 30%, balloon 50%
  const result = calculateSmart(100_000, 0.08, 5, 30, 20)
  const balloonAmount = 100_000 * 0.50
  assertAlmostEquals(result.balloon_payment, result.cuotas_payment + balloonAmount, 0.01)
})

Deno.test('crédito inteligente: lanza error si PIE >= 100%', () => {
  assertThrows(() => calculateSmart(100_000, 0.08, 5, 30, 100), Error, 'PIE')
})

Deno.test('crédito inteligente: lanza error si cuotas_percentage <= 0', () => {
  assertThrows(() => calculateSmart(100_000, 0.08, 5, 0, 20), Error, 'cuotas')
})

Deno.test('crédito inteligente: lanza error si balloon resulta negativo', () => {
  assertThrows(() => calculateSmart(100_000, 0.08, 5, 50, 60), Error, 'balloon')
})

Deno.test('crédito inteligente: lanza error si plazo es 0', () => {
  assertThrows(() => calculateSmart(100_000, 0.08, 0, 30, 20), Error, 'plazo')
})
