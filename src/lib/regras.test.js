import { describe, expect, it } from 'vitest'
import { camposCalculados, datasAoConcluir, diasTrabalhados, fecharSessao, proximoNumero, regraAutomatica } from './regras.js'

describe('regras automáticas', () => {
  it('Trello, Reunião de Setor e Claude preenchem IA, Template e Solicitante', () => {
    expect(regraAutomatica('Ajustes Trello', 'Demandas Diversas')).toMatchObject({ usoIA: 'Não', usoTemplate: 'Não', solicitante: 'Marketing' })
    expect(regraAutomatica('Pauta semanal', 'Reunião de Setor')).toMatchObject({ usoIA: 'Não', usoTemplate: 'Não', solicitante: 'Marketing' })
    expect(regraAutomatica('Aprendizado da Claude', 'Demandas Diversas')).toMatchObject({ usoIA: 'Sim', usoTemplate: 'Não', solicitante: 'Marketing' })
    expect(regraAutomatica('Card de boas-vindas', 'Card Comunicação Interna')).toBeNull()
  })

  it('segue a prioridade: Trello antes de Claude', () => {
    expect(regraAutomatica('Trello com Claude', '')).toMatchObject({ usoIA: 'Não', motivo: 'nome com "Trello"' })
  })
})

describe('cálculos', () => {
  it('economia nunca negativa e prazo em dias', () => {
    expect(camposCalculados({ tempoMinSeg: 1800, tempoMaxSeg: 7200, tempoGastoSeg: 3600, dataSolicitacao: '2026-10-01', dataEntrega: '2026-10-03' })).toEqual({
      economizadoMinSeg: 0,
      economizadoMaxSeg: 3600,
      prazoDias: 2,
    })
  })

  it('sessão com relógio adiantado não fica negativa', () => {
    expect(fecharSessao(10_000, 70_400)).toEqual({ segundos: 60 })
    expect(fecharSessao(10_000, 5_000)).toEqual({ segundos: 0 })
  })

  it('próximo Nº do mês', () => {
    expect(proximoNumero([])).toBe(1)
    expect(proximoNumero([{ numero: 3 }, { numero: 7 }, { numero: 5 }])).toBe(8)
  })
})

describe('datas ao concluir', () => {
  it('dias trabalhados no fuso da Bahia', () => {
    const sessoes = [{ inicio: new Date('2026-10-14T23:30:00-03:00'), fim: new Date('2026-10-15T00:10:00-03:00') }]
    expect(diasTrabalhados(sessoes).sort()).toEqual(['2026-10-14', '2026-10-15'])
  })

  it('entrega é hoje e os outros dias de trabalho viram ajuste, sem a solicitação', () => {
    expect(datasAoConcluir({ dataSolicitacao: '2026-09-10', dias: ['2026-09-10', '2026-09-14', '2026-09-15', '2026-09-16'], hoje: '2026-09-16' })).toEqual({
      dataEntrega: '2026-09-16',
      datasAjuste: ['2026-09-14', '2026-09-15'],
    })
  })

  it('ao reabrir e concluir de novo, a entrega antiga vai para o ajuste sem repetir', () => {
    expect(
      datasAoConcluir({ dataSolicitacao: '2026-10-01', datasAjuste: ['2026-10-02'], dataEntregaAnterior: '2026-10-03', dias: ['2026-10-02', '2026-10-08'], hoje: '2026-10-08' }),
    ).toEqual({ dataEntrega: '2026-10-08', datasAjuste: ['2026-10-02', '2026-10-03'] })
  })
})
