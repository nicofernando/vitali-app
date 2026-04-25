import { describe, expect, it } from 'vitest'
import { DATA_BLOCKS, DOCUMENT_TYPE_BLOCKS, getBlocksForContextNeeds, getBlocksForDocumentType, needsClient, needsQuote, needsUnit } from './document-variables'

describe('dATA_BLOCKS', () => {
  it('contiene los 7 bloques esperados', () => {
    const ids = DATA_BLOCKS.map(b => b.id)
    expect(ids).toContain('cliente')
    expect(ids).toContain('proyecto')
    expect(ids).toContain('torre')
    expect(ids).toContain('unidad')
    expect(ids).toContain('cotizacion')
    expect(ids).toContain('credito_frances')
    expect(ids).toContain('credito_inteligente')
  })

  it('cada bloque tiene id, label y variables no vacías', () => {
    for (const block of DATA_BLOCKS) {
      expect(block.id).toBeTruthy()
      expect(block.label).toBeTruthy()
      expect(block.variables.length).toBeGreaterThan(0)
    }
  })

  it('cada variable tiene key, label y example', () => {
    for (const block of DATA_BLOCKS) {
      for (const variable of block.variables) {
        expect(variable.key).toMatch(/^d\./)
        expect(variable.label).toBeTruthy()
        expect(variable.example).toBeTruthy()
      }
    }
  })
})

describe('dOCUMENT_TYPE_BLOCKS', () => {
  it('define el tipo cotizacion con los 7 bloques', () => {
    expect(DOCUMENT_TYPE_BLOCKS.cotizacion).toHaveLength(7)
    expect(DOCUMENT_TYPE_BLOCKS.cotizacion).toContain('cliente')
    expect(DOCUMENT_TYPE_BLOCKS.cotizacion).toContain('credito_frances')
    expect(DOCUMENT_TYPE_BLOCKS.cotizacion).toContain('credito_inteligente')
  })
})

describe('getBlocksForDocumentType', () => {
  it('retorna todos los bloques de cotizacion en el orden correcto', () => {
    const blocks = getBlocksForDocumentType('cotizacion')
    expect(blocks).toHaveLength(7)
    expect(blocks[0].id).toBe('cliente')
  })

  it('retorna array vacío para un tipo desconocido', () => {
    expect(getBlocksForDocumentType('nda')).toEqual([])
    expect(getBlocksForDocumentType('')).toEqual([])
  })

  it('los bloques retornados son subconjunto de DATA_BLOCKS', () => {
    const blocks = getBlocksForDocumentType('cotizacion')
    const allIds = DATA_BLOCKS.map(b => b.id)
    for (const block of blocks) {
      expect(allIds).toContain(block.id)
    }
  })
})

describe('getBlocksForContextNeeds', () => {
  it('retorna los bloques que coinciden con contextNeeds', () => {
    const blocks = getBlocksForContextNeeds(['cliente', 'unidad'])
    expect(blocks).toHaveLength(2)
    expect(blocks.map(b => b.id)).toContain('cliente')
    expect(blocks.map(b => b.id)).toContain('unidad')
  })

  it('retorna array vacío si contextNeeds está vacío', () => {
    expect(getBlocksForContextNeeds([])).toEqual([])
  })

  it('retorna array vacío si ningún id coincide con DATA_BLOCKS', () => {
    expect(getBlocksForContextNeeds(['bloque_inexistente', 'otro'])).toEqual([])
  })

  it('respeta el orden de DATA_BLOCKS, no el de contextNeeds', () => {
    const blocks = getBlocksForContextNeeds(['cotizacion', 'cliente'])
    expect(blocks[0].id).toBe('cliente')
    expect(blocks[1].id).toBe('cotizacion')
  })
})

describe('needsQuote', () => {
  it('retorna true si cotizacion está presente', () => {
    expect(needsQuote(['cotizacion'])).toBe(true)
  })

  it('retorna true si credito_frances está presente', () => {
    expect(needsQuote(['credito_frances'])).toBe(true)
  })

  it('retorna true si credito_inteligente está presente', () => {
    expect(needsQuote(['credito_inteligente'])).toBe(true)
  })

  it('retorna true si hay mezcla de bloques que incluye cotización', () => {
    expect(needsQuote(['cliente', 'cotizacion', 'unidad'])).toBe(true)
  })

  it('retorna false si no hay ningún bloque de cotización', () => {
    expect(needsQuote(['cliente', 'unidad', 'proyecto', 'torre'])).toBe(false)
  })

  it('retorna false con array vacío', () => {
    expect(needsQuote([])).toBe(false)
  })
})

describe('needsUnit', () => {
  it('retorna true si tiene bloque unidad y no hay cotización', () => {
    expect(needsUnit(['unidad'])).toBe(true)
  })

  it('retorna true si tiene torre o proyecto sin cotización', () => {
    expect(needsUnit(['torre'])).toBe(true)
    expect(needsUnit(['proyecto'])).toBe(true)
    expect(needsUnit(['unidad', 'torre', 'proyecto'])).toBe(true)
  })

  it('retorna false si tiene bloque de unidad pero también cotización (cotización tiene precedencia)', () => {
    expect(needsUnit(['unidad', 'cotizacion'])).toBe(false)
    expect(needsUnit(['torre', 'credito_frances'])).toBe(false)
  })

  it('retorna false si no tiene bloques de unidad/torre/proyecto', () => {
    expect(needsUnit(['cliente'])).toBe(false)
    expect(needsUnit([])).toBe(false)
  })
})

describe('needsClient', () => {
  it('retorna true si tiene bloque cliente y no hay cotización', () => {
    expect(needsClient(['cliente'])).toBe(true)
  })

  it('retorna false si tiene cliente pero también hay cotización', () => {
    expect(needsClient(['cliente', 'cotizacion'])).toBe(false)
    expect(needsClient(['cliente', 'credito_inteligente'])).toBe(false)
  })

  it('retorna false si no tiene bloque cliente', () => {
    expect(needsClient(['unidad', 'proyecto'])).toBe(false)
    expect(needsClient([])).toBe(false)
  })
})
