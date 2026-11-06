import { describe, expect, it } from 'vitest'
import { posicaoFlutuante } from './flutuante.js'

const tela = { largura: 1280, altura: 720 }
const calendario = { largura: 288, altura: 330 }
const campo = (left, top, altura = 40) => ({ left, top, bottom: top + altura })

describe('calendário do campo de data', () => {
  it('com espaço, abre embaixo e alinhado ao campo', () => {
    expect(posicaoFlutuante(campo(100, 100), calendario, tela)).toEqual({ top: 144, left: 100 })
  })

  it('perto da borda direita, vai para a esquerda sem passar da tela', () => {
    expect(posicaoFlutuante(campo(1100, 100), calendario, tela)).toEqual({ top: 144, left: 1280 - 288 - 8 })
  })

  it('perto do fim da tela, abre para cima', () => {
    expect(posicaoFlutuante(campo(100, 600), calendario, tela)).toEqual({ top: 600 - 4 - 330, left: 100 })
  })

  it('sem espaço em cima nem embaixo, fica inteiro na tela', () => {
    const baixa = { largura: 1280, altura: 400 }
    expect(posicaoFlutuante(campo(100, 180), calendario, baixa)).toEqual({ top: 400 - 330 - 8, left: 100 })
  })

  it('no celular, cabe na largura com a margem', () => {
    const celular = { largura: 375, altura: 812 }
    expect(posicaoFlutuante(campo(200, 300), calendario, celular)).toEqual({ top: 344, left: 375 - 288 - 8 })
    expect(posicaoFlutuante(campo(2, 300), calendario, celular).left).toBe(8)
  })
})
