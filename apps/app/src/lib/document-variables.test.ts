import { describe, expect, it } from 'vitest'
import { DATA_BLOCKS, DOCUMENT_TYPE_BLOCKS, getBlocksForDocumentType } from './document-variables'

describe('DATA_BLOCKS', () => {
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

describe('DOCUMENT_TYPE_BLOCKS', () => {
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
