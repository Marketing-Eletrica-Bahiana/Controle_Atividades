import { describe, expect, it } from 'vitest'
import { agruparENumerar, montarDemanda, sugerirPessoa } from './importacao.js'

const membros = [
  { id: 'ana.souza@exemplo.com', nome: 'Ana Souza' },
  { id: 'bia@exemplo.com', nome: 'Beatriz Lima' },
]

const linha = (extra) => ({
  aba: 'Julho', linha: 2, nome: 'Card', tipo: 'Card Comunicação Interna', dataSolicitacao: null, dataEntrega: '2026-07-01',
  datasAjuste: [], tempoGastoSeg: 600, tempoMinSeg: null, tempoMaxSeg: null, usoIA: '', usoTemplate: '',
  solicitante: '', publico: '', numeroPlanilha: null, responsavel: 'Ana', avisos: [], erro: null, mes: '2026-07',
  ...extra,
})

describe('importação', () => {
  it('liga o Responsável pelo nome, primeiro nome ou e-mail, sem diferenciar acentos', () => {
    expect(sugerirPessoa('ana', membros)?.id).toBe('ana.souza@exemplo.com')
    expect(sugerirPessoa('Beatriz Lima', membros)?.id).toBe('bia@exemplo.com')
    expect(sugerirPessoa('BIA@exemplo.com', membros)?.id).toBe('bia@exemplo.com')
    expect(sugerirPessoa('Ánà', membros)?.id).toBe('ana.souza@exemplo.com')
    expect(sugerirPessoa('Carla', membros)).toBeNull()
    expect(sugerirPessoa('', membros)).toBeNull()
  })

  it('numera por pessoa e por mês, pulando linhas com erro ou sem pessoa', () => {
    const linhas = [
      linha({ responsavel: 'Ana', linha: 2 }),
      linha({ responsavel: 'Beatriz', linha: 3 }),
      linha({ responsavel: 'Ana', linha: 4 }),
      linha({ responsavel: 'Ana', linha: 5, mes: '2026-08' }),
      linha({ responsavel: 'Ana', linha: 6, erro: 'Tempo gasto ilegível' }),
      linha({ responsavel: 'Carla', linha: 7 }),
    ]
    const grupos = agruparENumerar(linhas, (l) => sugerirPessoa(l.responsavel, membros))
    expect(grupos.map((g) => [g.pessoa.nome, g.mes, g.linhas.map((l) => `${l.linha}:${l.numero}`)])).toEqual([
      ['Ana Souza', '2026-07', ['2:1', '4:2']],
      ['Beatriz Lima', '2026-07', ['3:1']],
      ['Ana Souza', '2026-08', ['5:1']],
    ])
  })

  it('segue o Nº da planilha quando todas as linhas têm Nº', () => {
    const linhas = [linha({ linha: 2, numeroPlanilha: 5 }), linha({ linha: 3, numeroPlanilha: 2 })]
    const [grupo] = agruparENumerar(linhas, () => membros[0])
    expect(grupo.linhas.map((l) => `${l.linha}:${l.numero}`)).toEqual(['3:1', '2:2'])
  })

  it('completa tempo e público pela tabela de tipos e calcula economia e prazo', () => {
    const tiposPorNome = new Map([['card comunicacao interna', { minH: 0.5, maxH: 2, publico: 'Interno' }]])
    const demanda = montarDemanda(
      linha({ numero: 1, dataSolicitacao: '2026-06-28', datasAjuste: ['2026-06-30'] }),
      { area: 'designs', pessoa: membros[0], tiposPorNome, arquivo: 'planilha.xlsx', quem: 'admin@exemplo.com', agora: 'AGORA', marcaDoServidor: 'SERVIDOR' },
    )
    expect(demanda).toMatchObject({
      area: 'designs', numero: 1, mes: '2026-07', publico: 'Interno', tempoMinSeg: 1800, tempoMaxSeg: 7200,
      economizadoMinSeg: 1200, economizadoMaxSeg: 6600, prazoDias: 3, responsavelEmail: 'ana.souza@exemplo.com',
      responsavelNome: 'Ana Souza', status: 'concluida', importada: true, arquivoOrigem: 'planilha.xlsx',
      datasAjuste: ['2026-06-30'], criadoEm: 'SERVIDOR',
    })
    expect(demanda.historico).toEqual([
      { quem: 'admin@exemplo.com', quando: 'AGORA', acao: 'importacao', campo: '', antes: '', depois: 'planilha.xlsx (Julho, linha 2)' },
    ])
  })

  it('mantém o tempo estimado da planilha quando existe e nunca economiza negativo', () => {
    const demanda = montarDemanda(linha({ numero: 1, tempoMinSeg: 300, tempoMaxSeg: 900 }), {
      area: 'designs', pessoa: membros[0], tiposPorNome: new Map(), arquivo: 'x.xlsx', quem: '', agora: '', marcaDoServidor: '',
    })
    expect(demanda.economizadoMinSeg).toBe(0)
    expect(demanda.economizadoMaxSeg).toBe(300)
    expect(demanda.prazoDias).toBeNull()
    expect(demanda.publico).toBe('')
  })
})
