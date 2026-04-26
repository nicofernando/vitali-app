export function validateRut(rut: string): boolean {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (!/^\d+[0-9K]$/.test(clean) || clean.length < 2 || clean.length > 9)
    return false

  const body = clean.slice(0, -1)
  const check = clean.slice(-1)

  let sum = 0
  let factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }

  const remainder = sum % 11
  const expected = remainder === 0 ? '0' : remainder === 1 ? 'K' : String(11 - remainder)

  return check === expected
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
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${check}`
}
