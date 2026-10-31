import { describe, expect, it } from 'vitest'
import { diasDaSemana, mesesEntre, nomeDoDia, resumoDoPeriodo, segundaDaSemana, tempoPorDia } from './semana.js'

const sessao = (quando, seg) => ({ inicio: new Date(quando), seg })

describe('semana', () => {
  it('a semana começa na segunda, inclusive quando o dia é domingo', () => {
    expect(segundaDaSemana('2026-10-31')).toBe('2026-10-26')
    expect(segundaDaSemana('2026-11-01')).toBe('2026-10-26')
    expect(segundaDaSemana('2026-10-26')).toBe('2026-10-26')
    expect(diasDaSemana('2026-10-26')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
    expect(nomeDoDia('2026-10-31')).toBe('Sábado')
  })

  it('lista os meses de um período', () => {
    expect(mesesEntre('2026-09-28', '2026-10-03')).toEqual(['2026-09', '2026-10'])
    expect(mesesEntre('2026-07-01', '2026-10-31')).toEqual(['2026-07', '2026-08', '2026-09', '2026-10'])
  })

  it('tempo por dia vem das sessões; importadas usam a data de entrega', () => {
    const demandas = [
      { id: 'a', nome: 'Reels', usoIA: 'Sim', dataEntrega: '2026-10-28', economizadoMinSeg: 600, economizadoMaxSeg: 1200, sessoes: [sessao('2026-10-26T10:00:00-03:00', 1800), sessao('2026-10-28T23:30:00-03:00', 600), sessao('2026-10-20T10:00:00-03:00', 999)] },
      { id: 'b', nome: 'Card', usoIA: 'Não', dataEntrega: '2026-10-27', tempoGastoSeg: 900, sessoes: [] },
      { id: 'c', nome: 'Fora', dataEntrega: '2026-10-10', tempoGastoSeg: 500, sessoes: [] },
    ]
    const itens = tempoPorDia(demandas, '2026-10-26', '2026-11-01')
    expect(itens.map((i) => [i.dia, i.demanda.id, i.segundos])).toEqual([
      ['2026-10-26', 'a', 1800],
      ['2026-10-27', 'b', 900],
      ['2026-10-28', 'a', 600],
    ])
    expect(resumoDoPeriodo(itens, '2026-10-26', '2026-11-01')).toEqual({
      totalSeg: 3300,
      demandas: 2,
      economizadoMinSeg: 600,
      economizadoMaxSeg: 1200,
      porcentagemIA: 50,
    })
  })
})
