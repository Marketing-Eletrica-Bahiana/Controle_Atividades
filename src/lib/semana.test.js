import { describe, expect, it } from 'vitest'
import {
  diasDaSemana, horasDeTrabalho, horasDeTrabalhoPorPessoa, mesesEntre, nomeDoDia, resumoDoPeriodo, segundaDaSemana, segundosPorDia, segundosRepetidos, tempoPorDia,
} from './semana.js'

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

describe('horas de trabalho com demandas simultâneas', () => {
  const hora = (h, m = 0) => new Date(`2026-11-25T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`).getTime()
  const demanda = (id, email, sessoes, extra = {}) => ({
    id, responsavelEmail: email, responsavelNome: email, sessoes, tempoGastoSeg: sessoes.reduce((s, x) => s + x.seg, 0), ...extra,
  })
  const DIA = '2026-11-25'

  it('conta o relógio uma vez só no trecho em que rodaram juntas', () => {
    expect(segundosRepetidos([{ inicio: hora(9), fim: hora(10) }, { inicio: hora(9, 30), fim: hora(10) }])).toBe(1800)
    expect(segundosRepetidos([{ inicio: hora(9), fim: hora(10) }, { inicio: hora(10), fim: hora(11) }])).toBe(0)
    expect(segundosRepetidos([{ inicio: hora(9), fim: hora(12) }, { inicio: hora(9, 30), fim: hora(10) }, { inicio: hora(11), fim: hora(13) }])).toBe(1800 + 3600)
  })

  it('o exemplo da pessoa: Reels 9h às 10h e Card 9h30 às 10h20 dão 1h20 de trabalho', () => {
    const reels = demanda('reels', 'ivie', [sessao('2026-11-25T09:00:00-03:00', 3600)])
    const card = demanda('card', 'ivie', [sessao('2026-11-25T09:30:00-03:00', 3000)])
    const itens = tempoPorDia([reels, card], DIA, DIA)
    expect(itens.map((i) => i.segundos).sort()).toEqual([3000, 3600])
    expect(horasDeTrabalho(itens)).toBe(4800)
    expect(resumoDoPeriodo(itens, DIA, DIA).totalSeg).toBe(4800)
  })

  it('pessoas diferentes trabalhando ao mesmo tempo somam normalmente', () => {
    const daIvie = demanda('a', 'ivie', [sessao('2026-11-25T09:00:00-03:00', 3600)])
    const daTais = demanda('b', 'tais', [sessao('2026-11-25T09:00:00-03:00', 3600)])
    const porPessoa = horasDeTrabalhoPorPessoa(tempoPorDia([daIvie, daTais], DIA, DIA))
    expect(porPessoa.get('ivie').segundos).toBe(3600)
    expect(porPessoa.get('tais').segundos).toBe(3600)
  })

  it('sessão manual não tem horário de verdade e soma inteira', () => {
    const manual = (seg) => ({ ...sessao('2026-11-25T08:00:00-03:00', seg), manual: true })
    const itens = tempoPorDia([demanda('a', 'ivie', [manual(1800)]), demanda('b', 'ivie', [manual(1800)])], DIA, DIA)
    expect(horasDeTrabalho(itens)).toBe(3600)
  })

  it('soma a sessão que ainda está rodando', () => {
    const reels = demanda('reels', 'ivie', [sessao('2026-11-25T09:00:00-03:00', 3600)])
    const card = demanda('card', 'ivie', [])
    const itens = [...tempoPorDia([reels], DIA, DIA), { dia: DIA, demanda: card, segundos: 1800 }]
    expect(horasDeTrabalho(itens, [{ email: 'ivie', dia: DIA, inicio: hora(9, 30), fim: hora(10) }])).toBe(3600)
  })

  it('nunca fica abaixo da maior demanda do dia', () => {
    const corrigida = demanda('a', 'ivie', [sessao('2026-11-25T09:00:00-03:00', 7200)], { tempoGastoSeg: 600 })
    const outra = demanda('b', 'ivie', [sessao('2026-11-25T09:00:00-03:00', 3600)])
    expect(horasDeTrabalho(tempoPorDia([corrigida, outra], DIA, DIA))).toBe(3600)
  })
})
