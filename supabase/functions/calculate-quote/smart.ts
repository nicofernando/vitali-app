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
 * Calcula un crédito inteligente (balloon payment).
 *
 * Estructura:
 *   PIE + cuotas + balloon = 100% del precio
 *
 * Las N-1 cuotas son calculadas con crédito francés sobre el monto de cuotas,
 * usando un plazo largo (30 años) para que las cuotas sean bajas.
 * La cuota N (balloon) incluye el saldo insoluto + intereses del último período.
 *
 * @param listPrice           Precio de lista del departamento
 * @param annualRate          Tasa anual del proyecto
 * @param termYears           Plazo en años (define cuántas cuotas se pagan)
 * @param cuotasPercentage    % del precio que se amortiza en cuotas (ej: 30)
 * @param piePercentage       % del precio que es PIE (ej: 20)
 */
export function calculateSmart(
  listPrice: number,
  annualRate: number,
  termYears: number,
  cuotasPercentage: number,
  piePercentage: number,
): SmartCreditResult {
  if (termYears <= 0) {
    throw new Error('El plazo debe ser mayor a 0')
  }
  if (piePercentage >= 100) {
    throw new Error('El PIE no puede ser 100% o más')
  }
  if (cuotasPercentage <= 0) {
    throw new Error('El porcentaje de cuotas debe ser mayor a 0')
  }

  const balloonPercentage = 100 - piePercentage - cuotasPercentage

  if (balloonPercentage < 0) {
    throw new Error('El balloon resultante es negativo. Verificá que PIE + cuotas no superen 100%')
  }

  const cuotasAmount = (listPrice * cuotasPercentage) / 100
  const balloonAmount = (listPrice * balloonPercentage) / 100
  const financingAmount = listPrice - (listPrice * piePercentage) / 100

  const termMonths = termYears * 12

  // Las N-1 cuotas: crédito francés sobre cuotasAmount a plazo largo (30 años)
  // para que las cuotas sean pequeñas
  const AMORTIZATION_YEARS = 30
  const frenchOnCuotas = calculateFrench(cuotasAmount, annualRate, AMORTIZATION_YEARS)
  const cuotasPayment = frenchOnCuotas.monthly_payment

  // Calcular saldo insoluto del capital de cuotas al mes (termMonths - 1)
  // Saldo = K * ((1+r)^n - (1+r)^t) / ((1+r)^n - 1)
  // donde t = meses pagados = termMonths - 1
  const r = annualRate / 12
  const nLargo = AMORTIZATION_YEARS * 12
  const t = termMonths - 1

  let saldoInsoluto: number
  if (r === 0) {
    saldoInsoluto = cuotasAmount - (cuotasPayment * t)
  }
  else {
    const factorN = Math.pow(1 + r, nLargo)
    const factorT = Math.pow(1 + r, t)
    saldoInsoluto = cuotasAmount * (factorN - factorT) / (factorN - 1)
  }

  // Cuota balloon = saldo insoluto + interés del último período + balloon_amount
  const interesUltimoPeriodo = saldoInsoluto * r
  const balloonPayment = Math.round((saldoInsoluto + interesUltimoPeriodo + balloonAmount) * 100) / 100

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
