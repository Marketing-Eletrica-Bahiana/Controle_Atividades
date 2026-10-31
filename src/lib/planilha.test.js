import { describe, expect, it } from 'vitest'
import { read, utils, write } from 'xlsx'
import { lerPlanilha } from './planilha.js'

// Número de série do Excel para uma data (sistema 1900).
const serie = (ano, mes, dia) => (Date.UTC(ano, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86400000
const hora = (h, m, s = 0) => (h * 3600 + m * 60 + s) / 86400

// Grava e lê de volta, para as células terem o texto formatado como numa planilha de verdade.
function montarPasta(abas) {
  const pasta = utils.book_new()
  for (const [nome, { linhas, formatos = {} }] of Object.entries(abas)) {
    const ws = utils.aoa_to_sheet(linhas)
    for (const [endereco, formato] of Object.entries(formatos)) ws[endereco].z = formato
    utils.book_append_sheet(pasta, ws, nome)
  }
  return read(write(pasta, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' })
}

describe('planilha "Relatório Designers"', () => {
  const cabecalho = [
    'Tipo de Demanda', 'Data de Solicitação', 'Data de Entrega', 'Tempo gasto', 'Uso de IA?', 'Uso de Template?',
    'Solicitante', 'Tipo de Atividade (automático)', 'Tempo mínimo estimado sem IA (h)',
    'Tempo máximo estimado sem IA (h)', 'Tempo economizado mín. com IA (h)', 'Público (automático)', 'Responsável',
  ]
  const pasta = montarPasta({
    'Relatório Designers - Julho': {
      linhas: [
        cabecalho,
        ['Cards de Fechamento', '', serie(2026, 7, 1), hora(0, 12, 27), '', '', '', 'Cards de Fechamento',
          hora(0, 20), hora(0, 25), 0, 'Externo', 'Ana'],
        ['Reels Dia dos Pais', serie(2026, 7, 2), serie(2026, 7, 4), hora(3, 34, 9), 'Sim', 'Não', 'Marketing',
          'Conteúdo para Redes Sociais', hora(0, 30), hora(8, 0), 0.1, 'Externo', 'Bia'],
        ['', '', '', '', '', '', '', '', '', '', 0, '', ''],
        ['Conteúdo para Redes Sociais', '', '', hora(2, 2, 19), '', '', '', 'Conteúdo para Redes Sociais',
          '', '', 0, 'Externo', 'Ana'],
      ],
      formatos: {
        C2: 'dd/mm/yyyy', D2: '[h]:mm:ss', I2: '[h]:mm:ss', J2: '[h]:mm:ss',
        B3: 'dd/mm/yyyy', C3: 'dd/mm/yyyy', D3: '[h]:mm:ss', I3: '[h]:mm:ss', J3: '[h]:mm:ss',
        D5: '[h]:mm:ss',
      },
    },
  })
  const resultado = lerPlanilha(pasta)

  it('ignora linhas vazias ou só com fórmulas', () => {
    expect(resultado.demandas).toHaveLength(3)
    expect(resultado.temResponsavel).toBe(true)
  })

  it('separa nome da tarefa e tipo de atividade', () => {
    const [, reels] = resultado.demandas
    expect(reels.nome).toBe('Reels Dia dos Pais')
    expect(reels.tipo).toBe('Conteúdo para Redes Sociais')
    expect(reels.responsavel).toBe('Bia')
  })

  it('lê datas e tempos guardados como números do Excel', () => {
    const [cards, reels] = resultado.demandas
    expect(cards.dataEntrega).toBe('2026-07-01')
    expect(cards.dataSolicitacao).toBeNull()
    expect(cards.tempoGastoSeg).toBe(747)
    expect(cards.tempoMinSeg).toBe(1200)
    expect(cards.tempoMaxSeg).toBe(1500)
    expect(reels.dataSolicitacao).toBe('2026-07-02')
    expect(reels.tempoMaxSeg).toBe(28800)
    expect(reels.usoIA).toBe('Sim')
    expect(reels.usoTemplate).toBe('Não')
  })

  it('tira o mês do nome da aba e o ano das datas', () => {
    expect(resultado.demandas.map((d) => d.mes)).toEqual(['2026-07', '2026-07', '2026-07'])
    expect(resultado.demandas[2].avisos).toContain('Sem data de solicitação e de entrega')
    expect(resultado.demandas[2].erro).toBeNull()
  })
})

describe('planilha mensal antiga', () => {
  const pasta = montarPasta({
    'Setembro 2026': {
      linhas: [
        ['Cronômetro de Atividades - Setembro 2026 (Completo)'],
        ['Tipo de Demanda', 'Data de Solicitação', 'Ajuste', 'Data de Entrega', 'Tempo Gasto', 'Uso de IA',
          'Uso de Template', 'Solicitante', 'Público', 'Nome da Demanda', 'Nº',
          'Tempo mínimo estimado sem IA (h)', 'Tempo máximo estimado sem IA (h)'],
        ['Datas Especiais', '10/09/2026', '14 e 15/09', '15/09/2026', '01:35:47', 'Sim', 'Sim', 'RH', 'Endomarketing',
          'Card Convite Roda de Conversa', 3, '01:30:00', '16:00:00'],
        ['Demandas Diversas', '', '', '01/09/2026', '00:24:00', '', '', '', 'Interno', 'Organização do Mês', 1,
          0.5, 2],
        ['Demandas Diversas', '', 'depois', '02/09/2026', 'muito', '', '', '', 'Interno', 'Linha com erro', 2, '', ''],
      ],
    },
  })
  const { demandas, temResponsavel } = lerPlanilha(pasta)

  it('acha o cabeçalho na segunda linha e usa Nome da Demanda', () => {
    expect(demandas).toHaveLength(3)
    expect(demandas[0].nome).toBe('Card Convite Roda de Conversa')
    expect(demandas[0].tipo).toBe('Datas Especiais')
    expect(demandas[0].numeroPlanilha).toBe(3)
    expect(temResponsavel).toBe(false)
  })

  it('guarda no Ajuste só as datas que não são solicitação nem entrega', () => {
    expect(demandas[0].datasAjuste).toEqual(['2026-09-14'])
    expect(demandas[0].mes).toBe('2026-09')
  })

  it('lê tempo estimado em horas decimais', () => {
    expect(demandas[1].tempoMinSeg).toBe(1800)
    expect(demandas[1].tempoMaxSeg).toBe(7200)
    expect(demandas[0].tempoMaxSeg).toBe(57600)
  })

  it('marca erro quando o tempo gasto é ilegível', () => {
    expect(demandas[2].erro).toBe('Tempo gasto ilegível: "muito"')
    expect(demandas[2].avisos).toContain('Ajuste ilegível: "depois"')
  })
})

describe('datas com mais de um dia e linhas incompletas', () => {
  const pasta = montarPasta({
    'Julho 2026': {
      linhas: [
        ['Cronômetro de Atividades - Julho 2026'],
        ['Tipo de Demanda', 'Data de Solicitação', 'Data de Entrega', 'Tempo Gasto', 'Nome da Demanda', 'Ajuste'],
        ['Card', '01/07/2026', '08/07 e 09/07/2026', '00:30:00', 'Card de boas-vindas', '05/07'],
        ['Card', '', '', '', 'Card sem tempo nem data', ''],
        ['', '', '10/07/2026', '00:10:00', '', ''],
        ['', '', '', '', '', ''],
      ],
    },
    Gráficos: { linhas: [['Gráficos'], ['Demanda', 'Quantidade']] },
  })

  it('a última data é a entrega e as outras vão para o Ajuste, junto com a coluna Ajuste', () => {
    const [primeira] = lerPlanilha(pasta).demandas
    expect(primeira.dataEntrega).toBe('2026-07-09')
    expect(primeira.datasAjuste).toEqual(['2026-07-05', '2026-07-08'])
  })

  it('só ignora a linha sem nome e sem tempo; tempo sem nome vira erro', () => {
    const { demandas } = lerPlanilha(pasta)
    expect(demandas).toHaveLength(3)
    expect(demandas[1].avisos).toContain('Sem tempo gasto (fica 00:00:00)')
    expect(demandas[2].erro).toBe('Sem nome da demanda')
  })

  it('mostra o que identificou e aceita correção do papel de cada aba', () => {
    const identificada = lerPlanilha(pasta)
    expect(identificada.abas.map((a) => [a.aba, a.papel, a.linhas])).toEqual([
      ['Julho 2026', 'demandas', 3],
      ['Gráficos', 'ignorar', 0],
    ])
    const corrigida = lerPlanilha(pasta, { papeis: { 'Julho 2026': 'ignorar', Gráficos: 'tipos' } })
    expect(corrigida.demandas).toHaveLength(0)
    expect(corrigida.abas[1].problema).toMatch(/Não achei/)
  })
})

describe('tabelas de apoio', () => {
  const pasta = montarPasta({
    'Tipo de Atividade': {
      linhas: [
        ['Tipo de Atividade', 'Tempo mínimo (h)', 'Tempo máximo (h)', 'Prazo estimado (dias)', 'Público'],
        ['Cards Aniversariantes do Mês', hora(0, 20), hora(0, 20), 1, 'Endomarketing'],
        ['Vídeos Aniversariantes do Mês', 0.33, 1, '', 'Endomarketing'],
      ],
      formatos: { B2: '[h]:mm:ss', C2: '[h]:mm:ss' },
    },
    'Palavras-chave': {
      linhas: [['Palavra-chave', 'Tipo de Atividade'], ['reels', 'Conteúdo para Redes Sociais'], ['', '']],
    },
    Listas: {
      linhas: [
        ['Setor solicitante', 'Sim/Não', 'Público', 'Mês'],
        ['Comercial', 'Sim', 'Interno', 'Julho'],
        ['CAE', 'Não', 'Eletricistas', 'Agosto'],
      ],
    },
    Dashboard: { linhas: [['Dashboard'], ['Mês:', 'Outubro']] },
  })
  const resultado = lerPlanilha(pasta)

  it('lê os tipos com tempo em hora ou em horas decimais e o prazo estimado', () => {
    expect(resultado.tipos).toEqual([
      expect.objectContaining({ nome: 'Cards Aniversariantes do Mês', minSeg: 1200, maxSeg: 1200, prazoEstimadoDias: 1 }),
      expect.objectContaining({ nome: 'Vídeos Aniversariantes do Mês', minSeg: 1188, maxSeg: 3600, prazoEstimadoDias: null }),
    ])
  })

  it('lê palavras-chave e listas, e ignora o resto', () => {
    expect(resultado.palavras).toEqual([expect.objectContaining({ palavra: 'reels', tipo: 'Conteúdo para Redes Sociais' })])
    expect(resultado.listas).toEqual({ publicos: ['Interno', 'Eletricistas'], solicitantes: ['Comercial', 'CAE'] })
    expect(resultado.abasIgnoradas).toEqual(['Dashboard'])
  })
})
