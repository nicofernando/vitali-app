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
