import { describe, expect, it } from 'vitest'
import { diasDaSemana, mesesEntre, nomeDoDia, resumoDoPeriodo, segundaDaSemana, segundosPorDia, tempoPorDia } from './semana.js'

const sessao = (quando, seg) => ({ inicio: new Date(quando), seg })

describe('tempo por dia com o Tempo Gasto editado', () => {
  const dias = (demanda) => Object.fromEntries(segundosPorDia(demanda))
  const sessoes = [sessao('2026-11-04T10:00:00-03:00', 3600), sessao('2026-11-05T09:00:00-03:00', 1800), sessao('2026-11-05T14:00:00-03:00', 12_000)]

  it('sem edição, cada dia soma as próprias sessões', () => {
    expect(dias({ tempoGastoSeg: 17_400, sessoes })).toEqual({ '2026-11-04': 3600, '2026-11-05': 13_800 })
    expect(dias({ sessoes })).toEqual({ '2026-11-04': 3600, '2026-11-05': 13_800 })
  })

  it('tempo diminuído: sai do dia mais recente primeiro', () => {
    expect(dias({ tempoGastoSeg: 10_000, sessoes })).toEqual({ '2026-11-04': 3600, '2026-11-05': 6400 })
    expect(dias({ tempoGastoSeg: 1000, sessoes })).toEqual({ '2026-11-04': 1000, '2026-11-05': 0 })
    expect(dias({ tempoGastoSeg: 0, sessoes })).toEqual({ '2026-11-04': 0, '2026-11-05': 0 })
  })

  it('tempo aumentado: entra no último dia com sessão', () => {
    expect(dias({ tempoGastoSeg: 20_000, sessoes })).toEqual({ '2026-11-04': 3600, '2026-11-05': 16_400 })
  })

  it('o caso do print: Reels editado de 03:56:05 para 01:58:08 e o total do dia volta a bater com a lista', () => {
    const reels = { tempoGastoSeg: 7088, sessoes: [sessao('2026-11-06T08:30:00-03:00', 14_165)] }
    const outras = [
      { tempoGastoSeg: 600, sessoes: [sessao('2026-11-06T11:00:00-03:00', 600)] },
      { tempoGastoSeg: 123, sessoes: [sessao('2026-11-06T11:20:00-03:00', 123)] },
    ]
    const total = [reels, ...outras].reduce((soma, d) => soma + (segundosPorDia(d).get('2026-11-06') ?? 0), 0)
    expect(total).toBe(7088 + 600 + 123)
    expect(tempoPorDia([reels], '2026-11-06', '2026-11-06').map((i) => i.segundos)).toEqual([7088])
  })
})

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
