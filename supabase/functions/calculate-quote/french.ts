export interface FrenchCreditResult {
  monthly_payment: number
  monthly_rate: number
  term_months: number
  total_paid: number
  financing_amount: number
}

/**
 * Calcula un crédito con sistema francés (cuotas iguales).
 *
 * Fórmula: PMT = K * r(1+r)^n / ((1+r)^n - 1)
 * donde r = tasa_anual / 12, n = plazo_años * 12
 *
 * @param principal   Monto a financiar
 * @param annualRate  Tasa de interés anual (ej: 0.08 = 8%)
 * @param termYears   Plazo en años
 */
export function calculateFrench(
  principal: number,
  annualRate: number,
  termYears: number,
): FrenchCreditResult {
  if (termYears <= 0) {
    throw new Error('El plazo debe ser mayor a 0')
  }
  if (annualRate < 0) {
    throw new Error('La tasa de interés no puede ser negativa')
  }
  if (principal < 0) {
    throw new Error('El monto a financiar no puede ser negativo')
  }
  if (principal === 0) {
    return {
      monthly_payment: 0,
      monthly_rate: annualRate / 12,
      term_months: termYears * 12,
      total_paid: 0,
      financing_amount: 0,
    }
  }

  const r = annualRate / 12
  const n = termYears * 12

  let monthlyPayment: number

  if (r === 0) {
    // Sin interés: dividir en cuotas iguales
    monthlyPayment = principal / n
  }
  else {
    const factor = Math.pow(1 + r, n)
    monthlyPayment = principal * (r * factor) / (factor - 1)
  }

  // Redondear a 2 decimales
  monthlyPayment = Math.round(monthlyPayment * 100) / 100

  return {
    monthly_payment: monthlyPayment,
    monthly_rate: r,
    term_months: n,
    total_paid: Math.round(monthlyPayment * n * 100) / 100,
    financing_amount: principal,
  }
}
