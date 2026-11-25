import { describe, expect, it } from 'vitest'
import { nomeParaBaixar, ordenarImagens, tamanhoReduzido, tipoAceito } from './imagens.js'

describe('imagens', () => {
  it('reduz o lado maior até o máximo, mantendo a proporção', () => {
    expect(tamanhoReduzido(4000, 3000, 1600)).toEqual({ largura: 1600, altura: 1200 })
    expect(tamanhoReduzido(1080, 1920, 1600)).toEqual({ largura: 900, altura: 1600 })
    expect(tamanhoReduzido(800, 600, 1600)).toEqual({ largura: 800, altura: 600 })
    expect(tamanhoReduzido(5000, 10, 320)).toEqual({ largura: 320, altura: 1 })
  })

  it('baixa sempre como .jpg', () => {
    expect(nomeParaBaixar('Arte Final.png')).toBe('Arte Final.jpg')
    expect(nomeParaBaixar('print')).toBe('print.jpg')
    expect(nomeParaBaixar('')).toBe('imagem.jpg')
  })

  it('aceita só o que o navegador consegue reduzir', () => {
    expect(tipoAceito('image/png')).toBe(true)
    expect(tipoAceito('image/jpeg')).toBe(true)
    expect(tipoAceito('image/svg+xml')).toBe(false)
    expect(tipoAceito('image/heic')).toBe(false)
    expect(tipoAceito('application/pdf')).toBe(false)
  })

  it('ordena das mais antigas para as mais novas', () => {
    const ts = (ms) => ({ toMillis: () => ms })
    expect(ordenarImagens([{ id: 'b', criadoEm: ts(2) }, { id: 'a', criadoEm: ts(1) }, { id: 'c' }]).map((i) => i.id)).toEqual(['c', 'a', 'b'])
  })
})
