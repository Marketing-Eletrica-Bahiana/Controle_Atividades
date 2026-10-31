import { describe, expect, it } from 'vitest'
import { evolucaoMensal, horasPor, principais, quantidadePor, tempoMedioPorTipo } from './painel.js'

const d = (id, extra) => ({ id, nome: id, sessoes: [], ...extra })
const itens = [
  { demanda: d('a', { area: 'designs', tipo: 'Card', tempoGastoSeg: 600, publico: 'Interno' }), segundos: 600 },
  { demanda: d('b', { area: 'designs', tipo: 'Card', tempoGastoSeg: 1800, publico: 'Externo' }), segundos: 1200 },
  { demanda: d('b', { area: 'designs', tipo: 'Card', tempoGastoSeg: 1800, publico: 'Externo' }), segundos: 600 },
  { demanda: d('c', { area: 'marketing', tipo: 'Vídeo', tempoGastoSeg: 3600, publico: '' }), segundos: 3600 },
]

describe('painel', () => {
  it('horas por campo somam os segundos do período', () => {
    expect(horasPor(itens, (x) => x.area)).toEqual([{ rotulo: 'marketing', segundos: 3600 }, { rotulo: 'designs', segundos: 2400 }])
  })

  it('demandas e público contam cada demanda uma vez', () => {
    expect(quantidadePor(itens, (x) => x.tipo)).toEqual([{ rotulo: 'Card', quantidade: 2 }, { rotulo: 'Vídeo', quantidade: 1 }])
    expect(quantidadePor(itens, (x) => x.publico).map((x) => x.rotulo)).toEqual(['Interno', 'Externo', 'Não informado'])
  })

  it('tempo médio por tipo usa o tempo total de cada demanda', () => {
    expect(tempoMedioPorTipo(itens)).toEqual([{ rotulo: 'Vídeo', segundos: 3600 }, { rotulo: 'Card', segundos: 1200 }])
  })

  it('evolução mês a mês e "Outros"', () => {
    const demandas = [d('x', { dataEntrega: '2026-07-10', tempoGastoSeg: 100 }), d('y', { dataEntrega: '2026-08-31', tempoGastoSeg: 200 })]
    expect(evolucaoMensal(demandas, ['2026-07', '2026-08', '2026-09'])).toEqual([
      { mes: '2026-07', segundos: 100, demandas: 1 },
      { mes: '2026-08', segundos: 200, demandas: 1 },
      { mes: '2026-09', segundos: 0, demandas: 0 },
    ])
    expect(principais([{ rotulo: 'a', q: 5 }, { rotulo: 'b', q: 3 }, { rotulo: 'c', q: 1 }], 2, 'q')).toEqual([{ rotulo: 'a', q: 5 }, { rotulo: 'Outros', q: 4 }])
  })
})
