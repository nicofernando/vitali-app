import { calculateFrench } from './french.ts'

export interface SmartCreditResult {
  cuotas_payment: number
  balloon_payment: number
  term_months: number
  cuotas_percentage: number
  balloon_percentage: number
  total_paid: number
  financing_amount: number
}

/**
 * Calcula un crédito inteligente (bullet payment).
 *
 * Estructura: PIE + cuotas + balloon = 100% del precio
 *
 * Las cuotas amortizan exactamente cuotasAmount en termYears (crédito francés).
 * La cuota final = última cuota regular + balloon_amount.
 * Si balloon_percentage = 0, todas las N cuotas son iguales.
 *
 * @param listPrice          Precio de lista del departamento
 * @param annualRate         Tasa anual del proyecto
 * @param termYears          Plazo en años
 * @param cuotasPercentage   % del precio que se amortiza en cuotas (ej: 30)
 * @param piePercentage      % del precio que es PIE (ej: 20)
 */
export function calculateSmart(
  listPrice: number,
  annualRate: number,
  termYears: number,
  cuotasPercentage: number,
  piePercentage: number,
): SmartCreditResult {
  if (termYears <= 0)
    throw new Error('El plazo debe ser mayor a 0')
  if (piePercentage >= 100)
    throw new Error('El PIE no puede ser 100% o más')
  if (cuotasPercentage <= 0)
    throw new Error('El porcentaje de cuotas debe ser mayor a 0')

  const balloonPercentage = 100 - piePercentage - cuotasPercentage

  if (balloonPercentage < 0)
    throw new Error('El balloon resultante es negativo. Verificá que PIE + cuotas no superen 100%')

  const cuotasAmount = (listPrice * cuotasPercentage) / 100
  const balloonAmount = (listPrice * balloonPercentage) / 100
  const financingAmount = listPrice - (listPrice * piePercentage) / 100
  const termMonths = termYears * 12

  // Las cuotas amortizan cuotasAmount en el plazo REAL (no en 30 años)
  const { monthly_payment: cuotasPayment } = calculateFrench(cuotasAmount, annualRate, termYears)

  // Cuota final = última cuota regular + balloon fijo
  // Si balloon = 0%, la cuota final es idéntica a las N-1 anteriores
  const balloonPayment = Math.round((cuotasPayment + balloonAmount) * 100) / 100

  const totalPaid = Math.round((cuotasPayment * (termMonths - 1) + balloonPayment) * 100) / 100

  return {
    cuotas_payment: cuotasPayment,
    balloon_payment: balloonPayment,
    term_months: termMonths,
    cuotas_percentage: cuotasPercentage,
    balloon_percentage: balloonPercentage,
    total_paid: totalPaid,
    financing_amount: financingAmount,
  }
}
