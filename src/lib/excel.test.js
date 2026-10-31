import { describe, expect, it } from 'vitest'
import { read } from 'xlsx'
import { abaDeDemandas, abaSimples, novaPasta } from './excel.js'
import { lerPlanilha } from './planilha.js'
import { formatarTempo, horasParaSegundos } from './tempo.js'

const demanda = (extra) => ({
  tipo: 'Conteúdo para Redes Sociais', dataSolicitacao: '2026-10-01', datasAjuste: ['2026-10-02', '2026-10-03'], dataEntrega: '2026-10-06',
  tempoGastoSeg: 5025, usoIA: 'Sim', usoTemplate: 'Não', solicitante: 'Marketing', publico: 'Externo', nome: 'Reels - Dia do Cliente',
  numero: 1, tempoMinSeg: 1800, tempoMaxSeg: 28800, economizadoMinSeg: 0, economizadoMaxSeg: 23775, prazoDias: 5, responsavelNome: 'Ana Souza',
  ...extra,
})

async function lerDeVolta(pasta) {
  return lerPlanilha(read(await pasta.xlsx.writeBuffer(), { type: 'buffer' }))
}

describe('o arquivo exportado volta na importação', () => {
  it('demandas do mês: mesmas datas, ajustes, tempos, campos e responsável', async () => {
    const pasta = await novaPasta()
    abaDeDemandas(pasta, 'Outubro 2026', 'Controle de Atividades | Designs | Outubro 2026', [
      demanda(),
      demanda({ nome: 'Card RH', tipo: 'Card Comunicação Interna', numero: 2, datasAjuste: [], usoIA: '', responsavelNome: 'Bia Lima' }),
    ])
    const lida = await lerDeVolta(pasta)
    expect(lida.abas.map((a) => a.papel)).toEqual(['demandas'])
    expect(lida.temResponsavel).toBe(true)
    expect(lida.demandas).toHaveLength(2)
    expect(lida.demandas[0]).toMatchObject({
      nome: 'Reels - Dia do Cliente', tipo: 'Conteúdo para Redes Sociais', dataSolicitacao: '2026-10-01', dataEntrega: '2026-10-06',
      datasAjuste: ['2026-10-02', '2026-10-03'], tempoGastoSeg: 5025, usoIA: 'Sim', usoTemplate: 'Não', solicitante: 'Marketing',
      publico: 'Externo', numeroPlanilha: 1, tempoMinSeg: 1800, tempoMaxSeg: 28800, responsavel: 'Ana Souza', mes: '2026-10', erro: null,
    })
    expect(lida.demandas[1]).toMatchObject({ usoIA: '', responsavel: 'Bia Lima', avisos: [] })
  })

  it('aba com nome, cargo e área no topo (exportação da semana) também é lida', async () => {
    const pasta = await novaPasta()
    abaDeDemandas(pasta, 'Ana Souza', 'Controle de Atividades | Semana', [demanda()], ['Ana Souza | Designer | Designs'])
    const lida = await lerDeVolta(pasta)
    expect(lida.demandas).toHaveLength(1)
    expect(lida.demandas[0].mes).toBe('2026-10')
  })

  it('tabela de referência: tipos e palavras-chave voltam iguais', async () => {
    const tipos = [{ nome: 'Card', minH: 1 / 3, maxH: 0.5, prazoEstimadoDias: 1, publico: 'Interno' }]
    const pasta = await novaPasta()
    abaSimples(
      pasta,
      'Tipo de Atividade',
      ['Tipo de Atividade', 'Tempo mínimo (h)', 'Tempo máximo (h)', 'Prazo estimado (dias)', 'Público'],
      tipos.map((t) => [t.nome, formatarTempo(horasParaSegundos(t.minH)), formatarTempo(horasParaSegundos(t.maxH)), t.prazoEstimadoDias, t.publico]),
    )
    abaSimples(pasta, 'Palavras-chave', ['Palavra-chave', 'Tipo de Atividade'], [['card', 'Card']])
    const lida = await lerDeVolta(pasta)
    expect(lida.tipos).toEqual([expect.objectContaining({ nome: 'Card', minSeg: 1200, maxSeg: 1800, prazoEstimadoDias: 1, publico: 'Interno' })])
    expect(lida.palavras).toEqual([expect.objectContaining({ palavra: 'card', tipo: 'Card' })])
  })
})

describe('arquivos do mês e da semana voltam na importação', async () => {
  const { montarMes, montarSemana } = await import('./excel.js')

  it('Exportar mês: a aba "Outubro 2026" é lida como demandas do mês', async () => {
    const pasta = await montarMes('Designs', '2026-10', [demanda(), demanda({ nome: 'Card', numero: 2, responsavelNome: 'Bia Lima' })])
    const lida = await lerDeVolta(pasta)
    expect(lida.abas).toEqual([expect.objectContaining({ aba: 'Outubro 2026', papel: 'demandas', linhas: 2 })])
    expect(lida.demandas.map((d) => [d.mes, d.responsavel])).toEqual([['2026-10', 'Ana Souza'], ['2026-10', 'Bia Lima']])
  })

  it('Exportar Excel da semana: Resumo é ignorado e cada pessoa vira uma aba de demandas', async () => {
    const resumo = { demandas: 1, totalSeg: 5025, economizadoMinSeg: 0, economizadoMaxSeg: 0, porcentagemIA: 100 }
    const pasta = await montarSemana({
      nomeDaArea: 'Designs', segunda: '2026-10-26', sabado: '2026-10-31',
      pessoas: [{ nome: 'Ana Souza', cargo: 'Designer', areas: 'Designs', demandas: [demanda()], resumo }],
    })
    const lida = await lerDeVolta(pasta)
    expect(lida.abas.map((a) => [a.aba, a.papel])).toEqual([['Resumo', 'ignorar'], ['Ana Souza', 'demandas']])
    expect(lida.demandas).toHaveLength(1)
  })
})
