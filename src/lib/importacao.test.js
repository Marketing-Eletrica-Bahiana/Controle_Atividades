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

describe('prévia das tabelas e dos meses', async () => {
  const { diferencaPalavras, diferencaTipos, planejarMes } = await import('./importacao.js')

  it('tipos: mostra o que entra, sai e muda', () => {
    const atuais = [
      { id: 'a', nome: 'Card', minH: 0.5, maxH: 1, publico: 'Interno', prazoEstimadoDias: 1 },
      { id: 'b', nome: 'Vídeo', minH: 1, maxH: 2, publico: 'Externo', prazoEstimadoDias: 2 },
      { id: 'c', nome: 'Antigo', minH: 1, maxH: 1, publico: '', prazoEstimadoDias: null },
    ]
    const planilha = [
      { nome: 'Card', minSeg: 1800, maxSeg: 3600, publico: 'Interno', prazoEstimadoDias: 1 },
      { nome: 'video', minSeg: 1800, maxSeg: 7200, publico: 'Externo', prazoEstimadoDias: 2 },
      { nome: 'Novo', minSeg: 600, maxSeg: 600, publico: '', prazoEstimadoDias: null },
    ]
    const diferenca = diferencaTipos(atuais, planilha)
    expect(diferenca.entram.map((t) => t.nome)).toEqual(['Novo'])
    expect(diferenca.saem.map((t) => t.id)).toEqual(['c'])
    expect(diferenca.mudam).toEqual([
      { nome: 'video', mudancas: ['nome passa de "Vídeo" para "video"', 'tempo mínimo passa de 01:00:00 para 00:30:00'] },
    ])
    expect(diferenca.iguais).toBe(1)
  })

  it('palavras-chave: entra, sai e muda de tipo', () => {
    const diferenca = diferencaPalavras(
      [{ id: '1', palavra: 'reels', tipo: 'Redes' }, { id: '2', palavra: 'card', tipo: 'Card' }],
      [{ palavra: 'Reels', tipo: 'Vídeo' }, { palavra: 'story', tipo: 'Redes' }],
    )
    expect(diferenca.entram.map((p) => p.palavra)).toEqual(['story'])
    expect(diferenca.saem.map((p) => p.id)).toEqual(['2'])
    expect(diferenca.mudam).toEqual([{ nome: 'Reels', mudancas: ['tipo passa de "Redes" para "Vídeo"'] }])
  })

  it('mês já importado é pulado, a menos que seja para substituir; cronômetro nunca sai', () => {
    const existentes = [{ id: 'i1', importada: true, numero: 1 }, { id: 'c1', importada: false, numero: 4 }]
    expect(planejarMes(10, existentes, false)).toMatchObject({ pular: true, entram: 0, saem: [] })
    expect(planejarMes(10, existentes, true)).toMatchObject({ pular: false, entram: 10, saem: ['i1'], primeiroNumero: 5 })
    expect(planejarMes(3, [], false)).toMatchObject({ pular: false, entram: 3, saem: [], primeiroNumero: 1 })
  })
})
