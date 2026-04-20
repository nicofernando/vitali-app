import { assertEquals, assertAlmostEquals, assertThrows } from 'jsr:@std/assert'
import { calculateFrench } from './french.ts'

Deno.test('crédito francés: calcula cuota correctamente', () => {
  // Caso conocido: $100,000 a 8% anual, 20 años
  // r = 0.08/12 = 0.006666...
  // n = 240
  // cuota = 100000 * (r*(1+r)^n) / ((1+r)^n - 1) ≈ 836.44
  const result = calculateFrench(100_000, 0.08, 20)

  assertAlmostEquals(result.monthly_payment, 836.44, 0.5)
  assertEquals(result.term_months, 240)
  assertEquals(result.financing_amount, 100_000)
  assertAlmostEquals(result.monthly_rate, 0.08 / 12, 1e-10)
})

Deno.test('crédito francés: tasa mensual es tasa_anual / 12', () => {
  const result = calculateFrench(50_000, 0.12, 10)
  assertAlmostEquals(result.monthly_rate, 0.12 / 12, 1e-10)
})

Deno.test('crédito francés: total_paid es cuota * n', () => {
  const result = calculateFrench(100_000, 0.08, 20)
  assertAlmostEquals(result.total_paid, result.monthly_payment * result.term_months, 0.01)
})

Deno.test('crédito francés: capital 0 retorna cuota 0', () => {
  const result = calculateFrench(0, 0.08, 20)
  assertEquals(result.monthly_payment, 0)
  assertEquals(result.total_paid, 0)
})

Deno.test('crédito francés: lanza error si plazo es 0', () => {
  assertThrows(
    () => calculateFrench(100_000, 0.08, 0),
    Error,
    'plazo',
  )
})

Deno.test('crédito francés: lanza error si tasa es negativa', () => {
  assertThrows(
    () => calculateFrench(100_000, -0.01, 20),
    Error,
    'tasa',
  )
})

Deno.test('crédito francés: tasa 0% divide en cuotas iguales sin interés', () => {
  // Con tasa 0, la cuota debería ser capital / n
  const result = calculateFrench(12_000, 0, 1)
  assertAlmostEquals(result.monthly_payment, 1000, 0.01)
})
