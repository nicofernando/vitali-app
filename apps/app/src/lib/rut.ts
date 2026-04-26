// Validación y formato de RUT chileno (Módulo 11, algoritmo del SII).
// Los factores rotan en la serie 2→3→4→5→6→7→2→3... de derecha a izquierda.
const MOD11_FACTORS = [2, 3, 4, 5, 6, 7]

export function validateRut(rut: string): boolean {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (!isFormatValid(clean))
    return false
  const body = clean.slice(0, -1)
  const check = clean.slice(-1)
  return computeCheckDigit(body) === check
}

/** `12.345.678-5` → `12345678-5` */
export function normalizeRut(rut: string): string {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (clean.length < 2)
    return rut
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`
}

/** `12345678-5` → `12.345.678-5` */
export function formatRut(rut: string): string {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (clean.length < 2)
    return rut
  const body = clean.slice(0, -1)
  const check = clean.slice(-1)
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${check}`
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function isFormatValid(clean: string): boolean {
  return /^\d+[0-9K]$/.test(clean) && clean.length >= 2 && clean.length <= 9
}

function computeCheckDigit(body: string): string {
  let sum = 0
  for (let i = body.length - 1; i >= 0; i--) {
    const factor = MOD11_FACTORS[(body.length - 1 - i) % MOD11_FACTORS.length]
    sum += Number(body[i]) * factor
  }
  const rem = sum % 11
  if (rem === 0)
    return '0'
  if (rem === 1)
    return 'K'
  return String(11 - rem)
}
